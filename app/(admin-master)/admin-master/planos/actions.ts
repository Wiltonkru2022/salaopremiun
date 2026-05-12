"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function nullableTextValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function numberValue(formData: FormData, key: string) {
  const raw = textValue(formData, key).replace(/[^\d,.-]/g, "").replace(",", ".");
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function integerOrNull(formData: FormData, key: string) {
  const raw = textValue(formData, key);
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

export async function salvarPlanoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("planos_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");

  if (!id) {
    throw new Error("Plano invalido para edicao.");
  }

  const payload = {
    nome: textValue(formData, "nome"),
    subtitulo: nullableTextValue(formData, "subtitulo"),
    valor_mensal: numberValue(formData, "valor_mensal"),
    preco_anual: numberValue(formData, "preco_anual"),
    limite_usuarios: integerOrNull(formData, "limite_usuarios") || 0,
    limite_profissionais: integerOrNull(formData, "limite_profissionais") || 0,
    trial_dias: integerOrNull(formData, "trial_dias") || 0,
    ideal_para: nullableTextValue(formData, "ideal_para"),
    cta: nullableTextValue(formData, "cta"),
    destaque: formData.get("destaque") === "on",
    ativo: formData.get("ativo") === "on",
    ordem: integerOrNull(formData, "ordem") || 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("planos_saas").update(payload).eq("id", id);

  if (error) {
    throw new Error(error.message || "Nao foi possivel salvar o plano.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "editar_plano",
    entidade: "planos_saas",
    entidadeId: id,
    descricao: `Plano ${payload.nome || id} editado pelo AdminMaster.`,
    payload,
  });

  revalidatePath("/admin-master/planos");
  revalidatePath("/admin-master/recursos");
  revalidateTag("plano-access-snapshot", "max");
}

export async function salvarRecursoPlanoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("recursos_editar");
  const supabase = getSupabaseAdmin();
  const idPlano = textValue(formData, "id_plano");
  const recursoCodigo = textValue(formData, "recurso_codigo");

  if (!idPlano || !recursoCodigo) {
    throw new Error("Recurso invalido para edicao.");
  }

  const payload = {
    id_plano: idPlano,
    recurso_codigo: recursoCodigo,
    habilitado: formData.get("habilitado") === "on",
    limite_numero: integerOrNull(formData, "limite_numero"),
    observacao: nullableTextValue(formData, "observacao"),
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("planos_recursos")
    .upsert(payload, { onConflict: "id_plano,recurso_codigo" });

  if (error) {
    throw new Error(error.message || "Nao foi possivel salvar o recurso.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "editar_recurso_plano",
    entidade: "planos_recursos",
    entidadeId: `${idPlano}:${recursoCodigo}`,
    descricao: `Recurso ${recursoCodigo} atualizado na matriz de planos.`,
    payload,
  });

  revalidatePath("/admin-master/planos");
  revalidatePath("/admin-master/recursos");
  revalidateTag("plano-access-snapshot", "max");
}
