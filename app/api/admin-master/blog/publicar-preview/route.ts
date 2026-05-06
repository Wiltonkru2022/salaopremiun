import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getBlogSupabaseAdmin } from "@/lib/blog/supabase";

function slugify(value: string) {
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
  return isUuid(value) || isUuid(slugify(value));
}

function isUnsafeCategory(category?: { slug?: string | null; nome?: string | null } | null) {
  return Boolean(
    category &&
      (isUuidLikeCategory(String(category.slug || "")) ||
        isUuidLikeCategory(String(category.nome || "")))
  );
}

async function getDefaultCategoryId(supabase: any) {
  const { data: existing, error: existingError } = await supabase
    .from("blog_categorias")
    .select("id")
    .eq("slug", "agenda-online")
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("blog_categorias")
    .upsert(
      {
        slug: "agenda-online",
        nome: "Agenda online",
        descricao: "Organização de horários, clientes, profissionais e remarcações.",
        ordem: 10,
        ativo: true,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error || !data?.id) throw error || new Error("Categoria padrão inválida.");
  return data.id;
}

async function resolveCategoryId(supabase: any, value: string) {
  const cleanValue = value.trim();

  if (isUuid(cleanValue)) {
    const { data, error } = await supabase
      .from("blog_categorias")
      .select("id, slug, nome")
      .eq("id", cleanValue)
      .maybeSingle();

    if (error) throw error;
    if (data?.id && !isUnsafeCategory(data)) return data.id;

    return getDefaultCategoryId(supabase);
  }

  if (isUuidLikeCategory(cleanValue)) {
    return getDefaultCategoryId(supabase);
  }

  const slug = slugify(cleanValue || "agenda-online");
  const { data: existing, error } = await supabase
    .from("blog_categorias")
    .select("id, slug, nome")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (existing?.id && !isUnsafeCategory(existing)) return existing.id;

  return getDefaultCategoryId(supabase);
}

export async function POST(request: Request) {
  await requireAdminMasterUser("comunicacao_ver");

  const body = await request.json();
  const title = String(body.title || "").trim();
  const slug = slugify(String(body.slug || title));
  const categoryId = String(body.categoryId || "").trim();
  const description = String(body.description || body.excerpt || title).trim();
  const content = String(body.content || "").trim();

  if (!title || !slug || !categoryId || !content) {
    return NextResponse.json(
      { error: "Título, categoria e conteúdo são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = getBlogSupabaseAdmin() as any;
  const now = new Date().toISOString();
  const resolvedCategoryId = await resolveCategoryId(supabase, categoryId);
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/admin-master/blog");
  revalidatePath(`/admin-master/blog/${slug}`);
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidateTag("blog-public", "max");

  return NextResponse.json({ slug });
}
