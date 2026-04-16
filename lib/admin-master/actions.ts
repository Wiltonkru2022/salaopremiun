import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function registrarAdminMasterAuditoria(params: {
  idAdmin: string;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  descricao?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.rpc("fn_admin_master_registrar_auditoria", {
    p_id_admin_usuario: params.idAdmin,
    p_acao: params.acao,
    p_entidade: params.entidade,
    p_entidade_id: params.entidadeId || null,
    p_descricao: params.descricao || null,
    p_payload_json: params.payload || {},
    p_ip: null,
    p_user_agent: null,
  });
}

export async function bloquearSalaoAdminMaster(params: {
  idSalao: string;
  idAdmin: string;
  motivo: string;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from("saloes")
    .update({ status: "bloqueado", updated_at: now })
    .eq("id", params.idSalao);

  await supabase.from("saloes_bloqueios").insert({
    id_salao: params.idSalao,
    tipo_bloqueio: "manual",
    motivo: params.motivo,
    origem: "admin_master",
    criado_por: params.idAdmin,
  });

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "bloquear_salao",
    entidade: "saloes",
    entidadeId: params.idSalao,
    descricao: params.motivo,
  });
}

export async function desbloquearSalaoAdminMaster(params: {
  idSalao: string;
  idAdmin: string;
  motivo: string;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from("saloes")
    .update({ status: "ativo", updated_at: now })
    .eq("id", params.idSalao);

  await supabase
    .from("saloes_bloqueios")
    .update({ finalizado_em: now })
    .eq("id_salao", params.idSalao)
    .is("finalizado_em", null);

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "desbloquear_salao",
    entidade: "saloes",
    entidadeId: params.idSalao,
    descricao: params.motivo,
  });
}

export async function trocarPlanoSalaoAdminMaster(params: {
  idSalao: string;
  idAdmin: string;
  planoCodigo: string;
  motivo: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: plano, error: planoError } = await supabase
    .from("planos_saas")
    .select("codigo, valor_mensal, limite_usuarios, limite_profissionais")
    .eq("codigo", params.planoCodigo)
    .eq("ativo", true)
    .maybeSingle();

  if (planoError || !plano) {
    throw new Error("Plano nao encontrado ou inativo.");
  }

  const planoRow = plano as {
    codigo: string;
    valor_mensal: number | string | null;
    limite_usuarios: number | null;
    limite_profissionais: number | null;
  };
  const now = new Date().toISOString();

  await supabase
    .from("saloes")
    .update({
      plano: planoRow.codigo,
      limite_usuarios: planoRow.limite_usuarios,
      limite_profissionais: planoRow.limite_profissionais,
      updated_at: now,
    })
    .eq("id", params.idSalao);

  await supabase
    .from("assinaturas")
    .update({
      plano: planoRow.codigo,
      valor: Number(planoRow.valor_mensal || 0),
      limite_usuarios: planoRow.limite_usuarios,
      limite_profissionais: planoRow.limite_profissionais,
      updated_at: now,
    })
    .eq("id_salao", params.idSalao);

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "trocar_plano",
    entidade: "assinaturas",
    entidadeId: params.idSalao,
    descricao: params.motivo,
    payload: { plano: planoRow.codigo },
  });
}

export async function ajustarVencimentoSalaoAdminMaster(params: {
  idSalao: string;
  idAdmin: string;
  vencimentoEm: string;
  motivo: string;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from("assinaturas")
    .update({
      vencimento_em: params.vencimentoEm,
      updated_at: now,
    })
    .eq("id_salao", params.idSalao);

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "ajustar_vencimento",
    entidade: "assinaturas",
    entidadeId: params.idSalao,
    descricao: params.motivo,
    payload: { vencimento_em: params.vencimentoEm },
  });
}

export async function criarNotaSalaoAdminMaster(params: {
  idSalao: string;
  idAdmin: string;
  titulo: string;
  nota: string;
}) {
  const supabase = getSupabaseAdmin();

  await supabase.from("admin_master_anotacoes_salao").insert({
    id_salao: params.idSalao,
    id_admin_usuario: params.idAdmin,
    titulo: params.titulo,
    nota: params.nota,
    interna: true,
  });

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "criar_nota_salao",
    entidade: "admin_master_anotacoes_salao",
    entidadeId: params.idSalao,
    descricao: params.titulo,
  });
}
