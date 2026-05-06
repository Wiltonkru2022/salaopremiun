"use server";

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

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function readTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function createBlogCategory(formData: FormData) {
  await requireAdminMasterUser("comunicacao_ver");

  const nome = readText(formData, "nome");
  const descricao = readText(formData, "descricao");
  const slug = slugify(readText(formData, "slug") || nome);

  if (!nome || !slug) {
    throw new Error("Informe nome e slug da categoria.");
  }

  const supabase = getSupabaseAdmin() as any;
  const { error } = await supabase.from("blog_categorias").upsert(
    {
      nome,
      slug,
      descricao,
      ativo: true,
    },
    { onConflict: "slug" }
  );

  if (error) {
    throw new Error(`Nao foi possivel salvar a categoria: ${error.message}`);
  }

  revalidatePath("/admin-master/blog");
  revalidatePath("/blog");
}

export async function createBlogPost(formData: FormData) {
  await requireAdminMasterUser("comunicacao_ver");

  const titulo = readText(formData, "titulo");
  const slug = slugify(readText(formData, "slug") || titulo);
  const descricao = readText(formData, "descricao");
  const resumo = readText(formData, "resumo");
  const conteudo = readText(formData, "conteudo");
  const categoriaId = readText(formData, "categoria_id");
  const imagemCapaUrl = readText(formData, "imagem_capa_url");
  const imagemCapaAlt = readText(formData, "imagem_capa_alt");
  const tempoLeitura = readText(formData, "tempo_leitura") || "5 min";
  const status = readText(formData, "status") || "rascunho";
  const destaque = readText(formData, "destaque") === "on";
  const tags = readTags(readText(formData, "tags"));

  if (!titulo || !slug || !descricao || !conteudo || !categoriaId) {
    throw new Error("Titulo, categoria, descricao e conteudo sao obrigatorios.");
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin() as any;
  const { error } = await supabase.from("blog_posts").upsert(
    {
      categoria_id: categoriaId,
      titulo,
      slug,
      descricao,
      resumo: resumo || descricao,
      conteudo,
      imagem_capa_url: imagemCapaUrl || "/marketing-kit/site-hero.png",
      imagem_capa_alt: imagemCapaAlt || titulo,
      tempo_leitura: tempoLeitura,
      status,
      destaque,
      tags,
      publicado_em: status === "publicado" ? now : null,
      atualizado_em: now,
    },
    { onConflict: "slug" }
  );

  if (error) {
    throw new Error(`Nao foi possivel salvar o post: ${error.message}`);
  }

  revalidatePath("/admin-master/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

