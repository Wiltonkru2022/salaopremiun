"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function nullableDateValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? new Date(value).toISOString() : null;
}

function parseFilters(value: string): Json {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Json) : {};
  } catch {
    return { texto: value };
  }
}

export async function salvarCampanhaAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("campanhas_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const nome = textValue(formData, "nome");

  if (!nome) {
    throw new Error("Informe o nome da campanha.");
  }

  const payload = {
    nome,
    tipo: textValue(formData, "tipo") || "marketing",
    publico_tipo: textValue(formData, "publico_tipo") || "todos",
    objetivo: textValue(formData, "objetivo") || null,
    status: textValue(formData, "status") || "rascunho",
    inicio_em: nullableDateValue(formData, "inicio_em"),
    fim_em: nullableDateValue(formData, "fim_em"),
    filtros_json: parseFilters(textValue(formData, "filtros_json")),
    criado_por: access.usuario.id,
  };

  if (id) {
    const { error } = await supabase.from("campanhas").update(payload).eq("id", id);
    if (error) throw new Error(error.message || "Nao foi possivel salvar a campanha.");
  } else {
    const { error } = await supabase.from("campanhas").insert(payload);
    if (error) throw new Error(error.message || "Nao foi possivel criar a campanha.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_campanha" : "criar_campanha",
    entidade: "campanhas",
    entidadeId: id || null,
    descricao: `Campanha ${nome} salva pelo AdminMaster.`,
    payload,
  });

  revalidatePath("/admin-master/campanhas");
  redirect("/admin-master/campanhas");
}
