import { getBlogSupabaseAdmin } from "@/lib/blog/supabase";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

type BlogCategory = {
  id?: string | null;
  slug?: string | null;
  nome?: string | null;
};

type NewsletterSubscriber = {
  email: string;
};

export function slugifyBlogValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function isUuid(value: string) {
  return Boolean(
    value.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
    )
  );
}

function isUuidLikeCategory(value: string) {
  return isUuid(value) || isUuid(slugifyBlogValue(value));
}

function isUnsafeCategory(category?: BlogCategory | null) {
  return Boolean(
    category &&
      (isUuidLikeCategory(String(category.slug || "")) ||
        isUuidLikeCategory(String(category.nome || "")))
  );
}

async function getDefaultCategoryId() {
  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  const { data: existing, error: existingError } = await supabase
    .from("blog_categorias")
    .select("id")
    .eq("slug", "agenda-online")
    .maybeSingle<{ id?: string | null }>();

  if (existingError) throw existingError;
  if (existing?.id) return String(existing.id);

  const { data, error } = await supabase
    .from("blog_categorias")
    .upsert(
      {
        slug: "agenda-online",
        nome: "Agenda online",
        descricao: "Organizacao de horarios, clientes, profissionais e remarcacoes.",
        ordem: 10,
        ativo: true,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single<{ id?: string | null }>();

  if (error || !data?.id) throw error || new Error("Categoria padrao invalida.");
  return String(data.id);
}

async function resolveCategoryId(value: string) {
  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  const cleanValue = value.trim();

  if (isUuid(cleanValue)) {
    const { data, error } = await supabase
      .from("blog_categorias")
      .select("id, slug, nome")
      .eq("id", cleanValue)
      .maybeSingle<BlogCategory>();

    if (error) throw error;
    if (data?.id && !isUnsafeCategory(data)) return String(data.id);

    return getDefaultCategoryId();
  }

  if (isUuidLikeCategory(cleanValue)) {
    return getDefaultCategoryId();
  }

  const slug = slugifyBlogValue(cleanValue || "agenda-online");
  const { data: existing, error } = await supabase
    .from("blog_categorias")
    .select("id, slug, nome")
    .eq("slug", slug)
    .maybeSingle<BlogCategory>();

  if (error) throw error;
  if (existing?.id && !isUnsafeCategory(existing)) return String(existing.id);

  return getDefaultCategoryId();
}

export async function publicarPreviewBlogPost(body: Record<string, unknown>) {
  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  const title = String(body.title || "").trim();
  const slug = slugifyBlogValue(String(body.slug || title));
  const categoryId = String(body.categoryId || "").trim();
  const description = String(body.description || body.excerpt || title).trim();
  const content = String(body.content || "").trim();

  if (!title || !slug || !categoryId || !content) {
    throw new Error("Titulo, categoria e conteudo sao obrigatorios.");
  }

  const now = new Date().toISOString();
  const resolvedCategoryId = await resolveCategoryId(categoryId);
  const { error } = await supabase.from("blog_posts").upsert(
    {
      categoria_id: resolvedCategoryId,
      titulo: title,
      slug,
      descricao: description,
      resumo: String(body.excerpt || description),
      conteudo: content,
      imagem_capa_url: String(body.coverImage || ""),
      imagem_capa_alt: String(body.coverAlt || title),
      tempo_leitura: String(body.readTime || "5 min"),
      tags: String(body.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      destaque: Boolean(body.featured),
      status: "publicado",
      publicado_em: now,
      atualizado_em: now,
    },
    { onConflict: "slug" }
  );

  if (error) throw error;
  return slug;
}

export async function cadastrarNewsletterBlog(params: {
  email: string;
  postSlug?: string | null;
}) {
  const supabase = getBlogSupabaseAdmin();
  const blogSupabase = asLooseSupabaseClient(supabase);
  const { error } = await blogSupabase.from("newsletter_subscribers").upsert(
    {
      email: params.email,
      origem: "blog",
      post_slug: params.postSlug || null,
    },
    { onConflict: "email" }
  );

  if (error) throw error;
}

export async function registrarVisualizacaoBlog(params: {
  postId: string;
  sessionId?: string | null;
  userAgent?: string | null;
}) {
  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());

  await supabase.from("blog_views").insert({
    post_id: params.postId,
    session_id: params.sessionId || null,
    user_agent: params.userAgent || null,
  });

  const { data, error } = await supabase.rpc("increment_blog_post_views", {
    p_post_id: params.postId,
  });

  if (error) throw error;
  return Number(data || 0);
}

export async function listarAssinantesNewsletterBlog() {
  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("origem", "blog")
    .order("criado_em", { ascending: false });

  if (error) throw error;

  return ((data || []) as NewsletterSubscriber[])
    .map((subscriber) => subscriber.email.trim().toLowerCase())
    .filter(Boolean)
    .filter((email, index, emails) => emails.indexOf(email) === index);
}
