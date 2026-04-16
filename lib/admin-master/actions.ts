import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function buildTicketPrioridade(gravidade?: string | null) {
  const normalized = normalizeText(gravidade).toLowerCase();

  if (normalized === "critica") return "critica";
  if (normalized === "alta") return "alta";
  if (normalized === "baixa") return "baixa";
  return "media";
}

function buildTicketCategoria(params: {
  tipo?: string | null;
  origem?: string | null;
}) {
  const source = `${normalizeText(params.tipo)} ${normalizeText(params.origem)}`.toLowerCase();

  if (source.includes("assinatura")) return "assinatura";
  if (source.includes("cobranca") || source.includes("checkout")) return "cobranca";
  if (source.includes("agenda")) return "agenda";
  if (source.includes("comanda")) return "comanda";
  if (source.includes("caixa")) return "caixa";
  if (source.includes("comissao")) return "comissao";
  if (source.includes("estoque")) return "estoque";
  if (source.includes("whatsapp")) return "whatsapp";
  if (source.includes("webhook") || source.includes("erro")) return "bug";
  return "suporte";
}

function buildTicketSla(prioridade: string) {
  const now = Date.now();

  if (prioridade === "critica") {
    return new Date(now + 4 * 60 * 60 * 1000).toISOString();
  }

  if (prioridade === "alta") {
    return new Date(now + 12 * 60 * 60 * 1000).toISOString();
  }

  if (prioridade === "baixa") {
    return new Date(now + 48 * 60 * 60 * 1000).toISOString();
  }

  return new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

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

export async function resolverAlertaAdminMaster(params: {
  idAlerta: string;
  idAdmin: string;
  motivo?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const motivo =
    normalizeText(params.motivo) || "Resolvido manualmente pelo AdminMaster.";

  const { data: alerta, error: alertaError } = await supabase
    .from("alertas_sistema")
    .select("id, id_salao, tipo, titulo, resolvido, id_ticket, payload_json")
    .eq("id", params.idAlerta)
    .maybeSingle();

  if (alertaError) {
    throw new Error("Erro ao carregar alerta para resolucao.");
  }

  if (!alerta) {
    throw new Error("Alerta nao encontrado.");
  }

  const alertaRow = alerta as {
    id: string;
    id_salao?: string | null;
    tipo?: string | null;
    titulo?: string | null;
    resolvido?: boolean | null;
    id_ticket?: string | null;
    payload_json?: Record<string, unknown> | null;
  };

  const payloadAtual =
    alertaRow.payload_json && typeof alertaRow.payload_json === "object"
      ? alertaRow.payload_json
      : {};

  await supabase
    .from("alertas_sistema")
    .update({
      resolvido: true,
      resolvido_por: params.idAdmin,
      resolvido_em: now,
      atualizado_em: now,
      payload_json: {
        ...payloadAtual,
        resolucao_motivo: motivo,
        resolvido_manual_em: now,
        resolvido_manual_por: params.idAdmin,
      },
    })
    .eq("id", params.idAlerta);

  if (alertaRow.id_ticket) {
    await supabase.from("ticket_eventos").insert({
      id_ticket: alertaRow.id_ticket,
      evento: "alerta_resolvido",
      descricao: motivo,
      payload_json: {
        id_alerta: alertaRow.id,
        tipo_alerta: alertaRow.tipo || null,
        resolvido_por: params.idAdmin,
      },
    });
  }

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "resolver_alerta",
    entidade: "alertas_sistema",
    entidadeId: params.idAlerta,
    descricao: motivo,
    payload: {
      id_salao: alertaRow.id_salao || null,
      tipo: alertaRow.tipo || null,
      id_ticket: alertaRow.id_ticket || null,
    },
  });

  return {
    idAlerta: alertaRow.id,
    idTicket: alertaRow.id_ticket || null,
    resolvido: true,
    motivo,
  };
}

export async function criarTicketPorAlertaAdminMaster(params: {
  idAlerta: string;
  idAdmin: string;
  mensagem?: string | null;
  assumir?: boolean | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: alerta, error: alertaError } = await supabase
    .from("alertas_sistema")
    .select(
      "id, id_salao, tipo, gravidade, origem_modulo, titulo, descricao, payload_json, id_ticket"
    )
    .eq("id", params.idAlerta)
    .maybeSingle();

  if (alertaError) {
    throw new Error("Erro ao carregar alerta para criar ticket.");
  }

  if (!alerta) {
    throw new Error("Alerta nao encontrado.");
  }

  const alertaRow = alerta as {
    id: string;
    id_salao?: string | null;
    tipo?: string | null;
    gravidade?: string | null;
    origem_modulo?: string | null;
    titulo?: string | null;
    descricao?: string | null;
    payload_json?: Record<string, unknown> | null;
    id_ticket?: string | null;
  };

  if (alertaRow.id_ticket) {
    const { data: ticketExistente } = await supabase
      .from("tickets")
      .select("id, numero, status")
      .eq("id", alertaRow.id_ticket)
      .maybeSingle();

    if (ticketExistente) {
      return {
        ticketId: String(ticketExistente.id),
        ticketNumero: Number(ticketExistente.numero || 0),
        status: String(ticketExistente.status || "aberto"),
        existed: true,
      };
    }
  }

  const prioridade = buildTicketPrioridade(alertaRow.gravidade);
  const categoria = buildTicketCategoria({
    tipo: alertaRow.tipo,
    origem: alertaRow.origem_modulo,
  });
  const mensagem =
    normalizeText(params.mensagem) ||
    [
      `Alerta vinculado: ${alertaRow.titulo || "Sem titulo"}`,
      alertaRow.descricao ? `Descricao: ${alertaRow.descricao}` : null,
      alertaRow.tipo ? `Tipo: ${alertaRow.tipo}` : null,
      alertaRow.origem_modulo ? `Origem: ${alertaRow.origem_modulo}` : null,
      alertaRow.gravidade ? `Gravidade: ${alertaRow.gravidade}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      id_salao: alertaRow.id_salao || null,
      assunto: alertaRow.titulo || "Alerta do sistema",
      categoria,
      prioridade,
      status: "aberto",
      origem: "alerta_admin_master",
      id_responsavel_admin:
        params.assumir === false ? null : params.idAdmin,
      sla_limite_em: buildTicketSla(prioridade),
      atualizado_em: now,
    })
    .select("id, numero, status")
    .single();

  if (ticketError || !ticketData) {
    throw new Error("Erro ao criar ticket a partir do alerta.");
  }

  const ticket = ticketData as {
    id: string;
    numero?: number | string | null;
    status?: string | null;
  };

  await supabase.from("ticket_mensagens").insert({
    id_ticket: ticket.id,
    autor_tipo: "admin",
    id_admin_usuario: params.idAdmin,
    mensagem,
    interna: true,
  });

  await supabase.from("ticket_eventos").insert({
    id_ticket: ticket.id,
    evento: "alerta_vinculado",
    descricao: "Ticket criado automaticamente a partir de um alerta do AdminMaster.",
    payload_json: {
      id_alerta: alertaRow.id,
      tipo_alerta: alertaRow.tipo || null,
      gravidade: alertaRow.gravidade || null,
      origem_modulo: alertaRow.origem_modulo || null,
    },
  });

  const payloadAtual =
    alertaRow.payload_json && typeof alertaRow.payload_json === "object"
      ? alertaRow.payload_json
      : {};

  await supabase
    .from("alertas_sistema")
    .update({
      id_ticket: ticket.id,
      atualizado_em: now,
      payload_json: {
        ...payloadAtual,
        ticket_numero: Number(ticket.numero || 0),
        ticket_criado_em: now,
        ticket_criado_por: params.idAdmin,
      },
    })
    .eq("id", alertaRow.id);

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "criar_ticket_alerta",
    entidade: "tickets",
    entidadeId: ticket.id,
    descricao: alertaRow.titulo || "Ticket criado por alerta",
    payload: {
      id_alerta: alertaRow.id,
      id_salao: alertaRow.id_salao || null,
      ticket_numero: Number(ticket.numero || 0),
      prioridade,
      categoria,
    },
  });

  return {
    ticketId: ticket.id,
    ticketNumero: Number(ticket.numero || 0),
    status: String(ticket.status || "aberto"),
    existed: false,
  };
}
