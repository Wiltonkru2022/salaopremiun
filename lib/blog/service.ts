import { unstable_noStore as noStore } from "next/cache";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import { defaultBlogCategories, defaultBlogPosts } from "@/lib/blog/content";

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

function canUseSupabaseAdmin() {
  return Boolean(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  );
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

function mapCategory(category: BlogDbCategory): BlogCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: category.nome,
    description: category.descricao || "",
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
    categorySlug: category?.slug || "gestao",
    categoryName: category?.nome || "Gestao",
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

async function getSupabaseAdminUnsafe() {
  if (!canUseSupabaseAdmin()) return null;

  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  return getSupabaseAdmin() as any;
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  noStore();

  try {
    const supabase = await getSupabaseAdminUnsafe();
    if (!supabase) return defaultBlogCategories;

    const { data, error } = await supabase
      .from("blog_categorias")
      .select("id, slug, nome, descricao")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error || !data?.length) return defaultBlogCategories;
    return data.map(mapCategory);
  } catch (error) {
    console.warn("Blog usando categorias padrao:", error);
    return defaultBlogCategories;
  }
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  noStore();

  try {
    const supabase = await getSupabaseAdminUnsafe();
    if (!supabase) return defaultBlogPosts;

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, categoria_id, slug, titulo, descricao, resumo, conteudo, imagem_capa_url, imagem_capa_alt, tempo_leitura, tags, destaque, publicado_em, categoria:blog_categorias(id, slug, nome, descricao)"
      )
      .eq("status", "publicado")
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false });

    if (error || !data?.length) return defaultBlogPosts;
    return data.map(mapPost);
  } catch (error) {
    console.warn("Blog usando posts padrao:", error);
    return defaultBlogPosts;
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await getPublishedBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getAdminBlogData() {
  noStore();

  const categories = await getBlogCategories();

  try {
    const supabase = await getSupabaseAdminUnsafe();
    if (!supabase) {
      return {
        categories,
        posts: defaultBlogPosts,
        usingFallback: true,
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
        posts: defaultBlogPosts,
        usingFallback: true,
      };
    }

    return {
      categories,
      posts: (data || []).map(mapPost),
      usingFallback: false,
    };
  } catch {
    return {
      categories,
      posts: defaultBlogPosts,
      usingFallback: true,
    };
  }
}

export async function getAdminBlogPostById(id: string): Promise<BlogPost | null> {
  noStore();
  const fallbackPost = defaultBlogPosts.find((post) => post.id === id || post.slug === id);
  const fallbackCategoryId = fallbackPost
    ? defaultBlogCategories.find((category) => category.slug === fallbackPost.categorySlug)?.id
    : undefined;

  try {
    const supabase = await getSupabaseAdminUnsafe();
    if (!supabase) {
      return fallbackPost
        ? {
            ...fallbackPost,
            categoryId: fallbackCategoryId,
            status: "publicado",
            rawContent: fallbackPost.body.join("\n\n"),
          }
        : null;
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
    return fallbackPost
      ? {
          ...fallbackPost,
          categoryId: fallbackCategoryId,
          status: "publicado",
          rawContent: fallbackPost.body.join("\n\n"),
        }
      : null;
  }
}

export async function getAdminBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  noStore();
  const fallbackPost = defaultBlogPosts.find((post) => post.slug === slug);
  const fallbackCategoryId = fallbackPost
    ? defaultBlogCategories.find((category) => category.slug === fallbackPost.categorySlug)?.id
    : undefined;

  try {
    const supabase = await getSupabaseAdminUnsafe();
    if (!supabase) {
      return fallbackPost
        ? {
            ...fallbackPost,
            categoryId: fallbackCategoryId,
            status: "publicado",
            rawContent: fallbackPost.body.join("\n\n"),
          }
        : null;
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
    return fallbackPost
      ? {
          ...fallbackPost,
          categoryId: fallbackCategoryId,
          status: "publicado",
          rawContent: fallbackPost.body.join("\n\n"),
        }
      : null;
  }
}
