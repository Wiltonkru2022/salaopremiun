"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function nullableTextValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function parseJsonValue(raw: string): Json {
  try {
    return JSON.parse(raw || "{}") as Json;
  } catch {
    throw new Error("O valor precisa ser um JSON válido.");
  }
}

export async function salvarConfiguracaoGlobalAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("operacao_reprocessar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const chave = textValue(formData, "chave");

  if (!chave) {
    throw new Error("Informe a chave da configuração.");
  }

  const valorJson = parseJsonValue(textValue(formData, "valor_json"));
  const now = new Date().toISOString();

  const { data: atual } = id
    ? await supabase
        .from("configuracoes_globais")
        .select("id, chave, valor_json")
        .eq("id", id)
        .maybeSingle()
    : await supabase
        .from("configuracoes_globais")
        .select("id, chave, valor_json")
        .eq("chave", chave)
        .maybeSingle();

  const payload = {
    chave,
    descricao: nullableTextValue(formData, "descricao"),
    valor_json: valorJson,
    atualizado_por: access.usuario.id,
    atualizado_em: now,
  };

  const query = atual?.id
    ? supabase
        .from("configuracoes_globais")
        .update(payload)
        .eq("id", String(atual.id))
        .select("id")
        .single()
    : supabase.from("configuracoes_globais").insert(payload).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível salvar a configuração global.");
  }

  await supabase.from("configuracoes_globais_historico").insert({
    chave,
    valor_anterior_json: (atual?.valor_json ?? null) as Json | null,
    valor_novo_json: valorJson,
    atualizado_por: access.usuario.id,
    atualizado_em: now,
  });

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: atual?.id ? "editar_configuracao_global" : "criar_configuracao_global",
    entidade: "configuracoes_globais",
    entidadeId: String(data.id),
    descricao: `Configuração global ${chave} salva pelo AdminMaster.`,
    payload: {
      chave,
      descricao: payload.descricao,
    },
  });

  revalidatePath("/admin-master/configuracoes-globais");
  revalidatePath("/admin-master/logs");
}
