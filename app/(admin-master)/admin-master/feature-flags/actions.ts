"use server";

import { revalidatePath } from "next/cache";
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

function dateTimeOrNull(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function selectedValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export async function salvarFeatureFlagAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("feature_flags_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const nome = textValue(formData, "nome");

  if (!nome) {
    throw new Error("Informe o nome da feature flag.");
  }

  const payload = {
    nome,
    descricao: nullableTextValue(formData, "descricao"),
    status_global: formData.get("status_global") === "on",
    tipo_liberacao: textValue(formData, "tipo_liberacao") || "plano",
    planos_json: selectedValues(formData, "planos"),
    data_inicio: dateTimeOrNull(formData, "data_inicio"),
    data_fim: dateTimeOrNull(formData, "data_fim"),
  };

  const query = id
    ? supabase.from("feature_flags").update(payload).eq("id", id).select("id").single()
    : supabase.from("feature_flags").insert(payload).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível salvar a feature flag.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_feature_flag" : "criar_feature_flag",
    entidade: "feature_flags",
    entidadeId: String(data.id),
    descricao: `Feature flag ${nome} salva pelo AdminMaster.`,
    payload,
  });

  revalidatePath("/admin-master/feature-flags");
  revalidatePath("/admin-master/logs");
}

export async function salvarFeatureFlagSalaoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("feature_flags_editar");
  const supabase = getSupabaseAdmin();
  const idFeatureFlag = textValue(formData, "id_feature_flag");
  const idSalao = textValue(formData, "id_salao");

  if (!idFeatureFlag || !idSalao) {
    throw new Error("Informe a feature flag e o salão.");
  }

  const payload = {
    id_feature_flag: idFeatureFlag,
    id_salao: idSalao,
    ativo: formData.get("ativo") === "on",
  };

  const { error } = await supabase
    .from("feature_flag_saloes")
    .upsert(payload, { onConflict: "id_feature_flag,id_salao" });

  if (error) {
    throw new Error(error.message || "Não foi possível salvar a liberação do salão.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "editar_feature_flag_salao",
    entidade: "feature_flag_saloes",
    entidadeId: `${idFeatureFlag}:${idSalao}`,
    descricao: "Liberação de feature flag para salão atualizada pelo AdminMaster.",
    payload,
  });

  revalidatePath("/admin-master/feature-flags");
  revalidatePath("/admin-master/logs");
}
