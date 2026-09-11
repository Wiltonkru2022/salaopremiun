"use server";

import { revalidatePath } from "next/cache";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function intValue(formData: FormData, key: string, fallback: number) {
  const value = Number(textValue(formData, key));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function jsonValue(formData: FormData, key: string): Json {
  const value = textValue(formData, key);
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed as Json;
  } catch {
    throw new Error("A regra JSON precisa ser um JSON válido.");
  }

  return {};
}

export async function salvarChecklistItemAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("planos_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const codigo = textValue(formData, "codigo");
  const nome = textValue(formData, "nome");

  if (!codigo || !nome) {
    throw new Error("Informe o código e o nome do critério.");
  }

  const payload = {
    codigo,
    nome,
    descricao: textValue(formData, "descricao") || null,
    categoria: textValue(formData, "categoria") || "onboarding",
    ordem: intValue(formData, "ordem", 0),
    peso: intValue(formData, "peso", 10),
    ativo: formData.get("ativo") === "on",
    regra_json: jsonValue(formData, "regra_json"),
    atualizado_em: new Date().toISOString(),
  };

  const query = id
    ? (supabase as any)
        .from("checklist_itens")
        .update(payload)
        .eq("id", id)
        .select("id")
        .single()
    : (supabase as any)
        .from("checklist_itens")
        .insert(payload)
        .select("id")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível salvar o critério.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_checklist_item" : "criar_checklist_item",
    entidade: "checklist_itens",
    entidadeId: String(data.id),
    descricao: `Critério de checklist salvo: ${nome}`,
    payload,
  });

  revalidatePath("/admin-master/checklists");
  revalidatePath("/admin-master/logs");
}

export async function salvarRegraTrialAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("planos_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const nome = textValue(formData, "nome");

  if (!nome) {
    throw new Error("Informe o nome da regra de trial.");
  }

  const payload = {
    nome,
    score_minimo: Math.min(100, intValue(formData, "score_minimo", 70)),
    dias_extra: intValue(formData, "dias_extra", 7),
    ativo: formData.get("ativo") === "on",
  };

  const query = id
    ? supabase
        .from("trial_extensoes_regras")
        .update(payload)
        .eq("id", id)
        .select("id")
        .single()
    : supabase
        .from("trial_extensoes_regras")
        .insert(payload)
        .select("id")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível salvar a regra de trial.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_regra_trial" : "criar_regra_trial",
    entidade: "trial_extensoes_regras",
    entidadeId: String(data.id),
    descricao: `Regra de trial salva: ${nome}`,
    payload,
  });

  revalidatePath("/admin-master/checklists");
  revalidatePath("/admin-master/logs");
}

export async function recalcularScoreSalaoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("operacao_reprocessar");
  const idSalao = textValue(formData, "id_salao");

  if (!idSalao) {
    throw new Error("Informe o salão para recalcular o score.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "fn_admin_master_calcular_score_onboarding",
    { p_id_salao: idSalao }
  );

  if (error) {
    throw new Error(error.message || "Não foi possível recalcular o score.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "recalcular_score_onboarding",
    entidade: "score_onboarding_salao",
    entidadeId: idSalao,
    descricao: "Score de onboarding recalculado pelo AdminMaster.",
    payload: { id_salao: idSalao, score: data },
  });

  revalidatePath("/admin-master/checklists");
}

export async function avaliarTrialExtraSalaoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("operacao_reprocessar");
  const idSalao = textValue(formData, "id_salao");

  if (!idSalao) {
    throw new Error("Informe o salão para avaliar o trial extra.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "fn_admin_master_avaliar_extensao_trial",
    { p_id_salao: idSalao }
  );

  if (error) {
    throw new Error(error.message || "Não foi possível avaliar o trial extra.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "avaliar_trial_extra",
    entidade: "trial_extensoes_automaticas",
    entidadeId: idSalao,
    descricao: "Trial extra avaliado manualmente pelo AdminMaster.",
    payload: { id_salao: idSalao, resultado: data },
  });

  revalidatePath("/admin-master/checklists");
  revalidatePath("/admin-master/assinaturas");
}
