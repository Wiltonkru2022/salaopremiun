import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
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

  const supabase = getSupabaseAdmin() as any;
  const now = new Date().toISOString();
  const { error } = await supabase.from("blog_posts").upsert(
    {
      categoria_id: categoryId,
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

  return NextResponse.json({ slug });
}

