"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getBlogSupabaseAdmin } from "@/lib/blog/supabase";
import {
  asLooseSupabaseClient,
  type LooseSupabaseClient,
} from "@/lib/supabase/loose-client";
import { enviarNewsletterPostPublicado } from "@/services/blogNewsletterEmail";

type BlogSupabaseClient = LooseSupabaseClient;

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

function isUuid(value: string) {
  return Boolean(
    value.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
    )
  );
}

function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

async function getDefaultCategoryId(supabase: BlogSupabaseClient) {
  const { data: existing, error: existingError } = await supabase
    .from("blog_categorias")
    .select("id")
    .eq("slug", "agenda-online")
    .maybeSingle<{ id?: string | null }>();

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
    .single<{ id?: string | null }>();

  if (error || !data?.id) throw error || new Error("Categoria padrão inválida.");
  return data.id;
}

async function resolveCategoryId(supabase: BlogSupabaseClient, value: string) {
  const cleanValue = value.trim();

  if (isUuid(cleanValue)) {
    const { data, error } = await supabase
      .from("blog_categorias")
      .select("id, slug, nome")
      .eq("id", cleanValue)
      .maybeSingle<{ id?: string | null; slug?: string | null; nome?: string | null }>();

    if (error) throw error;
    if (data?.id && !isUnsafeCategory(data)) return data.id;

    return getDefaultCategoryId(supabase);
  }

  if (isUuidLikeCategory(cleanValue)) {
    return getDefaultCategoryId(supabase);
  }

  const slug = slugify(cleanValue || "agenda-online");
  const { data: existing, error: existingError } = await supabase
    .from("blog_categorias")
    .select("id, slug, nome")
    .eq("slug", slug)
    .maybeSingle<{ id?: string | null; slug?: string | null; nome?: string | null }>();

  if (existingError) throw existingError;
  if (existing?.id && !isUnsafeCategory(existing)) return existing.id;

  if (isUnsafeCategory(existing)) {
    return getDefaultCategoryId(supabase);
  }

  const { data, error } = await supabase
    .from("blog_categorias")
    .upsert(
      {
        slug,
        nome: titleFromSlug(slug) || "Gestão",
        descricao: "Categoria criada pelo editor do blog.",
        ativo: true,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single<{ id?: string | null }>();

  if (error || !data?.id) {
    throw new Error(
      `Não foi possível preparar a categoria do post: ${error?.message || "categoria inválida"}`
    );
  }

  return data.id;
}

export type BlogPostActionState = {
  error?: string;
};

export async function createBlogCategory(formData: FormData) {
  await requireAdminMasterUser("comunicacao_ver");

  const nome = readText(formData, "nome");
  const descricao = readText(formData, "descricao");
  const slug = slugify(readText(formData, "slug") || nome);
  const ordem = Number(readText(formData, "ordem") || 100);

  if (!nome || !slug) {
    throw new Error("Informe nome e slug da categoria.");
  }

  if (isUuidLikeCategory(nome) || isUuidLikeCategory(slug)) {
    throw new Error("Use um nome de categoria em português, não um código interno.");
  }

  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  const { error } = await supabase.from("blog_categorias").upsert(
    {
      nome,
      slug,
      descricao,
      ordem: Number.isFinite(ordem) ? ordem : 100,
      ativo: true,
    },
    { onConflict: "slug" }
  );

  if (error) {
    throw new Error(`Não foi possível salvar a categoria: ${error.message}`);
  }

  revalidatePath("/admin-master/blog");
  revalidatePath("/blog");
  revalidateTag("blog-public", "max");
}

export async function createBlogPost(
  _previousState: BlogPostActionState,
  formData: FormData
): Promise<BlogPostActionState> {
  await requireAdminMasterUser("comunicacao_ver");

  const rawId = readText(formData, "id");
  const id = isUuid(rawId) ? rawId : "";
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
  const enviarEmailNewsletter =
    readText(formData, "enviar_email_newsletter") === "on";
  const tags = readTags(readText(formData, "tags"));

  if (!titulo || !slug || !descricao || !conteudo || !categoriaId) {
    return {
      error: "Título, categoria, descrição e conteúdo são obrigatórios.",
    };
  }

  const now = new Date().toISOString();
  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  try {
    const resolvedCategoryId = await resolveCategoryId(supabase, categoriaId);
    const { data: existingPost } = id
      ? await supabase
          .from("blog_posts")
          .select("status")
          .eq("id", id)
          .maybeSingle<{ status?: string | null }>()
      : await supabase
          .from("blog_posts")
          .select("status")
          .eq("slug", slug)
          .maybeSingle<{ status?: string | null }>();
    const shouldSendNewsletter =
      status === "publicado" &&
      enviarEmailNewsletter &&
      existingPost?.status !== "publicado";
    const payload = {
      categoria_id: resolvedCategoryId,
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
    };

    const { error } = id
      ? await supabase
          .from("blog_posts")
          .upsert({ ...payload, id }, { onConflict: "id" })
      : await supabase.from("blog_posts").upsert(payload, { onConflict: "slug" });

    if (error) {
      return {
        error: `Não foi possível salvar o post: ${error.message}`,
      };
    }
    if (shouldSendNewsletter) {
      try {
        await enviarNewsletterPostPublicado({
          slug,
          titulo,
          descricao,
          resumo: resumo || descricao,
        });
      } catch (newsletterError) {
        return {
          error:
            newsletterError instanceof Error
              ? `Post salvo, mas o e-mail não foi enviado: ${newsletterError.message}`
              : "Post salvo, mas o e-mail não foi enviado.",
        };
      }
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o post. Tente novamente.",
    };
  }

  revalidatePath("/admin-master/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath(`/admin-master/blog/${slug}`);
  revalidateTag("blog-public", "max");
  redirect(`/admin-master/blog/${slug}`);
}

export async function deleteBlogPost(formData: FormData) {
  await requireAdminMasterUser("comunicacao_ver");

  const rawId = readText(formData, "id");
  const id = isUuid(rawId) ? rawId : "";
  const slug = slugify(readText(formData, "slug"));

  if (!id) {
    throw new Error("Post inválido para exclusão.");
  }

  const supabase = asLooseSupabaseClient(getBlogSupabaseAdmin());
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    throw new Error(`Não foi possível excluir o post: ${error.message}`);
  }

  revalidatePath("/admin-master/blog");
  revalidatePath("/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath(`/admin-master/blog/${slug}`);
  }
  revalidateTag("blog-public", "max");
  redirect("/admin-master/blog");
}
