import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import {
  canUseBlogSupabaseAdmin,
  canUseBlogSupabasePublic,
  getBlogSupabaseAdmin,
  getBlogSupabasePublic,
} from "@/lib/blog/supabase";
import {
  asLooseSupabaseClient,
  type LooseSupabaseClient,
} from "@/lib/supabase/loose-client";

type BlogDbCategory = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
};

type BlogDbPost = {
  id: string;
  categoria_id?: string;
  slug: string;
  titulo: string;
  descricao: string;
  resumo: string | null;
  conteudo: string;
  imagem_capa_url: string | null;
  imagem_capa_alt: string | null;
  tempo_leitura: string | null;
  tags: string[] | null;
  status?: "rascunho" | "publicado" | "arquivado";
  destaque: boolean | null;
  views?: number | null;
  publicado_em: string | null;
  categoria: BlogDbCategory | null;
};

export type BlogAdminMetrics = {
  totalViews: number;
  newsletterSubscribers: number;
  conversionRate: number;
  topPostWeek: {
    title: string;
    slug: string;
    views: number;
  } | null;
  viewsLast7Days: {
    date: string;
    label: string;
    views: number;
  }[];
};

function createEmptyMetrics(): BlogAdminMetrics {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const today = new Date();

  return {
    totalViews: 0,
    newsletterSubscribers: 0,
    conversionRate: 0,
    topPostWeek: null,
    viewsLast7Days: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);

      return {
        date: key,
        label: formatter.format(date),
        views: 0,
      };
    }),
  };
}

function canUseBlogDatabase() {
  return canUseBlogSupabasePublic();
}

function splitBody(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function looksLikeUuid(value?: string | null) {
  return Boolean(
    String(value || "").match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  );
}

function readableCategoryName(category: BlogDbCategory) {
  if (looksLikeUuid(category.slug) || looksLikeUuid(category.nome.replace(/\s+/g, "-"))) {
    return "Agenda online";
  }

  return category.nome;
}

function mapCategory(category: BlogDbCategory): BlogCategory {
  return {
    id: category.id,
    slug: looksLikeUuid(category.slug) ? "agenda-online" : category.slug,
    name: readableCategoryName(category),
    description: category.descricao || "Artigos do blog SalãoPremium.",
  };
}

function mapPost(post: BlogDbPost): BlogPost {
  const category = post.categoria;

  return {
    id: post.id,
    slug: post.slug,
    title: post.titulo,
    description: post.descricao,
    excerpt: post.resumo || post.descricao,
    categorySlug: category
      ? looksLikeUuid(category.slug)
        ? "agenda-online"
        : category.slug
      : "gestao",
    categoryName: category ? readableCategoryName(category) : "Gestão",
    readTime: post.tempo_leitura || "5 min",
    publishedAt: post.publicado_em || new Date().toISOString(),
    coverImage: post.imagem_capa_url || "/marketing-kit/site-hero.png",
    coverAlt: post.imagem_capa_alt || post.titulo,
    tags: post.tags || [],
    body: splitBody(post.conteudo),
    bodyHtml: looksLikeHtml(post.conteudo)
      ? post.conteudo
      : splitBody(post.conteudo)
          .map((paragraph) => `<p>${paragraph}</p>`)
          .join(""),
    featured: Boolean(post.destaque),
    views: Number(post.views || 0),
    categoryId: post.categoria_id || category?.id,
    status: post.status || "publicado",
    rawContent: post.conteudo,
  };
}

function isSeoBlockedBlogPost(post: BlogDbPost) {
  const slug = String(post.slug || "").toLowerCase();
  const title = String(post.titulo || "").toLowerCase();

  return (
    slug.startsWith("post-teste-automatico") ||
    slug.startsWith("teste-automatico") ||
    title.includes("post teste automático") ||
    title.includes("post teste automatico")
  );
}

async function getBlogDatabaseUnsafe(): Promise<LooseSupabaseClient | null> {
  if (!canUseBlogDatabase()) return null;

  return asLooseSupabaseClient(getBlogSupabasePublic());
}

async function getBlogAdminDatabaseUnsafe(): Promise<LooseSupabaseClient | null> {
  if (!canUseBlogSupabaseAdmin()) return null;

  return asLooseSupabaseClient(getBlogSupabaseAdmin());
}

async function loadBlogCategories(): Promise<BlogCategory[]> {
  try {
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from<BlogDbCategory[]>("blog_categorias")
      .select("id, slug, nome, descricao")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error || !data?.length) return [];
    return (data as BlogDbCategory[]).map(mapCategory);
  } catch (error) {
    console.warn("Blog sem categorias carregadas:", error);
    return [];
  }
}

const getBlogCategoriesCached = unstable_cache(
  loadBlogCategories,
  ["blog-categories-v2"],
  {
    revalidate: 600,
    tags: ["blog-public"],
  }
);

export async function getBlogCategories(): Promise<BlogCategory[]> {
  return getBlogCategoriesCached();
}

async function loadPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from<BlogDbPost[]>("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, views, publicado_em, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("status", "publicado")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false });

    if (error || !data?.length) return [];
    return (data as BlogDbPost[]).filter((post) => !isSeoBlockedBlogPost(post)).map(mapPost);
  } catch (error) {
    console.warn("Blog sem posts carregados:", error);
    return [];
  }
}

const getPublishedBlogPostsCached = unstable_cache(
  loadPublishedBlogPosts,
  ["blog-posts-publicados-v2"],
  {
    revalidate: 300,
    tags: ["blog-public"],
  }
);

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  return getPublishedBlogPostsCached();
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await getPublishedBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getBlogAdminMetrics(): Promise<BlogAdminMetrics> {
  noStore();

  const metrics = createEmptyMetrics();

  try {
    const supabase = await getBlogAdminDatabaseUnsafe();
    if (!supabase) return metrics;

    const [{ data: posts }, { count: subscribers }] = await Promise.all([
      supabase.from("blog_posts").select("id, slug, titulo, views"),
      supabase
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true }),
    ]);

    const postList = (posts || []) as Array<{
      id: string;
      slug: string;
      titulo: string;
      views: number | null;
    }>;

    metrics.totalViews = postList.reduce(
      (total, post) => total + Number(post.views || 0),
      0
    );
    metrics.newsletterSubscribers = Number(subscribers || 0);
    metrics.conversionRate = metrics.totalViews
      ? Number(((metrics.newsletterSubscribers / metrics.totalViews) * 100).toFixed(1))
      : 0;

    const firstDay = metrics.viewsLast7Days[0]?.date;
    if (!firstDay) return metrics;

    const { data: weeklyViews } = await supabase
      .from("blog_views")
      .select("post_id, criado_em")
      .gte("criado_em", `${firstDay}T00:00:00.000Z`);

    const postMap = new Map(postList.map((post) => [post.id, post]));
    const byDay = new Map(metrics.viewsLast7Days.map((day) => [day.date, day]));
    const byPost = new Map<string, number>();

    for (const view of (weeklyViews || []) as Array<{
      post_id: string | null;
      criado_em: string | null;
    }>) {
      if (!view.criado_em) continue;

      const dateKey = view.criado_em.slice(0, 10);
      const day = byDay.get(dateKey);
      if (day) day.views += 1;

      if (view.post_id) {
        byPost.set(view.post_id, (byPost.get(view.post_id) || 0) + 1);
      }
    }

    const topPostId = Array.from(byPost.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topPostId) {
      const post = postMap.get(topPostId[0]);
      if (post) {
        metrics.topPostWeek = {
          title: post.titulo,
          slug: post.slug,
          views: topPostId[1],
        };
      }
    }

    return metrics;
  } catch (error) {
    console.warn("Métricas do blog indisponíveis:", error);
    return metrics;
  }
}

export async function getAdminBlogData() {
  noStore();

  const categories = await getBlogCategories();
  const metrics = await getBlogAdminMetrics();

  try {
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) {
      return {
        categories,
        posts: [],
        metrics,
        usingFallback: true,
        error:
          "A nova conexão do Supabase do blog não está configurada neste ambiente.",
      };
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, views, publicado_em, status, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .order("atualizado_em", { ascending: false })
      .limit(30);

    if (error) {
      return {
        categories,
        posts: [],
        metrics,
        usingFallback: true,
        error: error.message,
      };
    }

    return {
      categories,
      posts: ((data || []) as BlogDbPost[]).map(mapPost),
      metrics,
      usingFallback: false,
      error: null,
    };
  } catch (error) {
    return {
      categories,
      posts: [],
      metrics,
      usingFallback: true,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível ler os posts na nova base do blog.",
    };
  }
}

export async function getAdminBlogPostById(id: string): Promise<BlogPost | null> {
  noStore();

  try {
    const supabase = (await getBlogAdminDatabaseUnsafe()) || (await getBlogDatabaseUnsafe());
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, views, publicado_em, status, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapPost(data as BlogDbPost);
  } catch {
    return null;
  }
}

export async function getAdminBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  noStore();

  try {
    const supabase = (await getBlogAdminDatabaseUnsafe()) || (await getBlogDatabaseUnsafe());
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, views, publicado_em, status, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return mapPost(data as BlogDbPost);
  } catch {
    return null;
  }
}

export async function getAdminBlogPostBySlugOrId(
  value: string
): Promise<BlogPost | null> {
  const bySlug = await getAdminBlogPostBySlug(value);
  if (bySlug) return bySlug;

  return getAdminBlogPostById(value);
}
