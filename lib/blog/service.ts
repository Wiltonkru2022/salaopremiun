import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import {
  canUseBlogSupabasePublic,
  getBlogSupabasePublic,
} from "@/lib/blog/supabase";

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
  publicado_em: string | null;
  categoria: BlogDbCategory | null;
};

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
    description: category.descricao || "Artigos do blog SalaoPremium.",
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
    categoryId: post.categoria_id || category?.id,
    status: post.status || "publicado",
    rawContent: post.conteudo,
  };
}

async function getBlogDatabaseUnsafe() {
  if (!canUseBlogDatabase()) return null;

  return getBlogSupabasePublic() as any;
}

async function loadBlogCategories(): Promise<BlogCategory[]> {
  try {
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("blog_categorias")
      .select("id, slug, nome, descricao")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error || !data?.length) return [];
    return data.map(mapCategory);
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
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, publicado_em, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("status", "publicado")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false });

    if (error || !data?.length) return [];
    return data.map(mapPost);
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

export async function getAdminBlogData() {
  noStore();

  const categories = await getBlogCategories();

  try {
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) {
      return {
        categories,
        posts: [],
        usingFallback: true,
        error:
          "A nova conexão do Supabase do blog não está configurada neste ambiente.",
      };
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, publicado_em, status, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .order("atualizado_em", { ascending: false })
      .limit(30);

    if (error) {
      return {
        categories,
        posts: [],
        usingFallback: true,
        error: error.message,
      };
    }

    return {
      categories,
      posts: (data || []).map(mapPost),
      usingFallback: false,
      error: null,
    };
  } catch (error) {
    return {
      categories,
      posts: [],
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
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, publicado_em, status, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapPost(data);
  } catch {
    return null;
  }
}

export async function getAdminBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  noStore();

  try {
    const supabase = await getBlogDatabaseUnsafe();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, publicado_em, status, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return mapPost(data);
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
