import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  captureSystemEvent,
  registrarAcaoAutomaticaSistema,
} from "@/lib/monitoring/server";
import type { Json } from "@/types/database.generated";

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

type AdminMasterAlertRow = {
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

async function loadAlertTicketLink(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  alerta: AdminMasterAlertRow;
}) {
  if (params.alerta.id_ticket) {
    const { data: ticketExistente } = await params.supabase
      .from("tickets")
      .select("id, numero, status")
      .eq("id", params.alerta.id_ticket)
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

  const { data: eventoExistente } = await params.supabase
    .from("ticket_eventos")
    .select("id_ticket, tickets(id, numero, status)")
    .in("evento", ["alerta_vinculado", "alerta_vinculado_automaticamente"])
    .contains("payload_json", { id_alerta: params.alerta.id })
    .limit(1)
    .maybeSingle();

  const ticketFromEvento = Array.isArray(
    (eventoExistente as { tickets?: unknown } | null)?.tickets
  )
    ? ((eventoExistente as {
        tickets?: {
          id?: string;
          numero?: number | string | null;
          status?: string | null;
        }[];
      } | null)?.tickets?.[0] ?? null)
    : ((eventoExistente as {
        tickets?: {
          id?: string;
          numero?: number | string | null;
          status?: string | null;
        } | null;
      } | null)?.tickets ?? null);

  if (!ticketFromEvento?.id) {
    return null;
  }

  if (!params.alerta.id_ticket) {
    const payloadAtual =
      params.alerta.payload_json && typeof params.alerta.payload_json === "object"
        ? params.alerta.payload_json
        : {};

    await params.supabase
      .from("alertas_sistema")
      .update({
        id_ticket: ticketFromEvento.id,
        atualizado_em: new Date().toISOString(),
        payload_json: {
          ...payloadAtual,
          ticket_numero: Number(ticketFromEvento.numero || 0),
        },
      })
      .eq("id", params.alerta.id);
  }

  return {
    ticketId: String(ticketFromEvento.id),
    ticketNumero: Number(ticketFromEvento.numero || 0),
    status: String(ticketFromEvento.status || "aberto"),
    existed: true,
  };
}

async function criarTicketPorAlertaBase(params: {
  idAlerta: string;
  idAdmin?: string | null;
  mensagem?: string | null;
  assumir?: boolean | null;
  automatico?: boolean | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const automatico = Boolean(params.automatico);

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

  const alertaRow = alerta as AdminMasterAlertRow;
  const existingTicket = await loadAlertTicketLink({
    supabase,
    alerta: alertaRow,
  });

  if (existingTicket) {
    return existingTicket;
  }

  const prioridade = buildTicketPrioridade(alertaRow.gravidade);
  const categoria = buildTicketCategoria({
    tipo: alertaRow.tipo,
    origem: alertaRow.origem_modulo,
  });
  const mensagem =
    normalizeText(params.mensagem) ||
    [
      automatico
        ? "Ticket aberto automaticamente para acompanhar um risco operacional detectado pelo AdminMaster."
        : `Alerta vinculado: ${alertaRow.titulo || "Sem titulo"}`,
      alertaRow.descricao ? `Descricao: ${alertaRow.descricao}` : null,
      alertaRow.tipo ? `Tipo: ${alertaRow.tipo}` : null,
      alertaRow.origem_modulo ? `Origem: ${alertaRow.origem_modulo}` : null,
      alertaRow.gravidade ? `Gravidade: ${alertaRow.gravidade}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const origem = automatico ? "alerta_admin_master_auto" : "alerta_admin_master";
  const autorNome = automatico ? "Automacao AdminMaster" : "AdminMaster";
  const responsavelAdmin =
    automatico || params.assumir === false ? null : params.idAdmin || null;

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      id_salao: alertaRow.id_salao || null,
      assunto: alertaRow.titulo || "Alerta do sistema",
      categoria,
      prioridade,
      status: "aberto",
      origem,
      id_responsavel_admin: responsavelAdmin,
      solicitante_nome: autorNome,
      solicitante_email: null,
      origem_contexto: {
        origem: automatico ? "admin_master_automacao" : "admin_master",
        modulo: "alertas_sistema",
        id_alerta: alertaRow.id,
        tipo_alerta: alertaRow.tipo || null,
        origem_modulo: alertaRow.origem_modulo || null,
      },
      ultima_interacao_em: now,
      atualizado_em: now,
      sla_limite_em: buildTicketSla(prioridade),
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
    id_admin_usuario: automatico ? null : params.idAdmin || null,
    autor_nome: autorNome,
    mensagem,
    interna: true,
  });

  await supabase.from("ticket_eventos").insert({
    id_ticket: ticket.id,
    evento: automatico
      ? "alerta_vinculado_automaticamente"
      : "alerta_vinculado",
    descricao: automatico
      ? "Ticket criado automaticamente a partir de um alerta do AdminMaster."
      : "Ticket criado manualmente a partir de um alerta do AdminMaster.",
    payload_json: {
      id_alerta: alertaRow.id,
      tipo_alerta: alertaRow.tipo || null,
      gravidade: alertaRow.gravidade || null,
      origem_modulo: alertaRow.origem_modulo || null,
      automatico,
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
        ticket_criado_por: automatico ? null : params.idAdmin || null,
        ticket_criado_automaticamente: automatico,
      },
    })
    .eq("id", alertaRow.id);

  if (automatico) {
    await registrarAcaoAutomaticaSistema({
      type: "alerta_admin_master_ticket_auto",
      reference: alertaRow.id,
      executed: true,
      success: true,
      log: `Ticket automatico criado para o alerta ${alertaRow.id}.`,
      details: {
        id_ticket: ticket.id,
        ticket_numero: Number(ticket.numero || 0),
        id_salao: alertaRow.id_salao || null,
        tipo_alerta: alertaRow.tipo || null,
      },
    });

    await captureSystemEvent({
      module: "admin_master",
      eventType: "automation_executed",
      severity: "info",
      message:
        alertaRow.titulo ||
        "Ticket automatico criado a partir de alerta do AdminMaster.",
      action: "criar_ticket_alerta_automatico",
      entity: "tickets",
      entityId: ticket.id,
      details: {
        id_alerta: alertaRow.id,
        id_salao: alertaRow.id_salao || null,
        ticket_numero: Number(ticket.numero || 0),
        tipo_alerta: alertaRow.tipo || null,
      },
      origin: "server",
      surface: "admin_master",
      createIncident: false,
    });
  } else if (params.idAdmin) {
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
  }

  return {
    ticketId: ticket.id,
    ticketNumero: Number(ticket.numero || 0),
    status: String(ticket.status || "aberto"),
    existed: false,
  };
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
    p_entidade_id: params.entidadeId || undefined,
    p_descricao: params.descricao || undefined,
    p_payload_json: (params.payload || {}) as Json,
    p_ip: undefined,
    p_user_agent: undefined,
  });

  await captureSystemEvent({
    module: "admin_master",
    eventType: "ui_event",
    severity: "info",
    message:
      normalizeText(params.descricao) ||
      `${normalizeText(params.acao)} em ${normalizeText(params.entidade)}`,
    action: params.acao,
    entity: params.entidade,
    entityId: params.entidadeId || null,
    idAdminUsuario: params.idAdmin,
    details: params.payload || {},
    origin: "server_action",
    surface: "admin_master",
    createIncident: false,
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

  const { error: updateError } = await supabase
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

  if (updateError) {
    throw new Error(updateError.message || "Erro ao marcar alerta como resolvido.");
  }

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
  return criarTicketPorAlertaBase({
    ...params,
    automatico: false,
  });
}

export async function criarTicketAutomaticoPorAlertaAdminMaster(params: {
  idAlerta: string;
  mensagem?: string | null;
}) {
  return criarTicketPorAlertaBase({
    idAlerta: params.idAlerta,
    mensagem: params.mensagem,
    automatico: true,
    assumir: false,
  });
}

export async function criarTicketPorCheckoutLockAdminMaster(params: {
  idCheckoutLock: string;
  idAdmin: string;
  mensagem?: string | null;
  assumir?: boolean | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: lock, error: lockError } = await supabase
    .from("assinatura_checkout_locks")
    .select(
      "id, id_salao, plano_codigo, billing_type, valor, idempotency_key, status, id_cobranca, asaas_payment_id, erro_texto, response_json, payload_json, created_at, updated_at"
    )
    .eq("id", params.idCheckoutLock)
    .maybeSingle();

  if (lockError) {
    throw new Error("Erro ao carregar checkout para criar ticket.");
  }

  if (!lock) {
    throw new Error("Checkout nao encontrado.");
  }

  const lockRow = lock as {
    id: string;
    id_salao?: string | null;
    plano_codigo?: string | null;
    billing_type?: string | null;
    valor?: number | string | null;
    idempotency_key?: string | null;
    status?: string | null;
    id_cobranca?: string | null;
    asaas_payment_id?: string | null;
    erro_texto?: string | null;
    response_json?: Record<string, unknown> | null;
    payload_json?: Record<string, unknown> | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  const payloadAtual =
    lockRow.payload_json && typeof lockRow.payload_json === "object"
      ? lockRow.payload_json
      : {};
  const ticketPayloadId = payloadAtual.ticket_id;

  if (typeof ticketPayloadId === "string" && ticketPayloadId) {
    const { data: ticketExistente } = await supabase
      .from("tickets")
      .select("id, numero, status")
      .eq("id", ticketPayloadId)
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

  const { data: eventoExistente } = await supabase
    .from("ticket_eventos")
    .select("id_ticket, tickets(id, numero, status)")
    .eq("evento", "checkout_reconciliacao_vinculada")
    .contains("payload_json", { id_checkout_lock: lockRow.id })
    .limit(1)
    .maybeSingle();

  const ticketFromEvento = Array.isArray(
    (eventoExistente as { tickets?: unknown } | null)?.tickets
  )
    ? ((eventoExistente as { tickets?: { id?: string; numero?: number | string | null; status?: string | null }[] } | null)
        ?.tickets?.[0] ?? null)
    : ((eventoExistente as { tickets?: { id?: string; numero?: number | string | null; status?: string | null } | null } | null)
        ?.tickets ?? null);

  if (ticketFromEvento?.id) {
    return {
      ticketId: String(ticketFromEvento.id),
      ticketNumero: Number(ticketFromEvento.numero || 0),
      status: String(ticketFromEvento.status || "aberto"),
      existed: true,
    };
  }

  const prioridade = lockRow.asaas_payment_id ? "alta" : "media";
  const assunto = "Reconciliar checkout de assinatura";
  const mensagem =
    normalizeText(params.mensagem) ||
    [
      "Checkout de assinatura precisa de reconciliacao financeira.",
      `Status do lock: ${lockRow.status || "-"}`,
      `Salao: ${lockRow.id_salao || "-"}`,
      `Plano: ${lockRow.plano_codigo || "-"}`,
      `Forma: ${lockRow.billing_type || "-"}`,
      `Valor: ${lockRow.valor || 0}`,
      `Asaas payment: ${lockRow.asaas_payment_id || "-"}`,
      `Cobranca local: ${lockRow.id_cobranca || "nao vinculada"}`,
      `Idempotencia: ${lockRow.idempotency_key || "-"}`,
      lockRow.erro_texto ? `Erro: ${lockRow.erro_texto}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      id_salao: lockRow.id_salao || null,
      assunto,
      categoria: "cobranca",
      prioridade,
      status: "aberto",
      origem: "checkout_reconciliacao_admin_master",
      id_responsavel_admin:
        params.assumir === false ? null : params.idAdmin,
      solicitante_nome: "AdminMaster",
      solicitante_email: null,
      origem_contexto: {
        origem: "admin_master",
        modulo: "assinatura_checkout",
        id_checkout_lock: lockRow.id,
        asaas_payment_id: lockRow.asaas_payment_id || null,
      },
      ultima_interacao_em: now,
      atualizado_em: now,
      sla_limite_em: buildTicketSla(prioridade),
    })
    .select("id, numero, status")
    .single();

  if (ticketError || !ticketData) {
    throw new Error("Erro ao criar ticket para reconciliacao do checkout.");
  }

  const ticket = ticketData as {
    id: string;
    numero?: number | string | null;
    status?: string | null;
  };

  await supabase.from("ticket_mensagens").insert({
    id_ticket: ticket.id,
    autor_tipo: "admin",
    autor_nome: "AdminMaster",
    id_admin_usuario: params.idAdmin,
    mensagem,
    interna: true,
  });

  await supabase.from("ticket_eventos").insert({
    id_ticket: ticket.id,
    evento: "checkout_reconciliacao_vinculada",
    descricao: "Ticket criado para reconciliar checkout de assinatura.",
    payload_json: {
      id_checkout_lock: lockRow.id,
      id_salao: lockRow.id_salao || null,
      plano_codigo: lockRow.plano_codigo || null,
      billing_type: lockRow.billing_type || null,
      valor: lockRow.valor || null,
      status_checkout: lockRow.status || null,
      id_cobranca: lockRow.id_cobranca || null,
      asaas_payment_id: lockRow.asaas_payment_id || null,
      idempotency_key: lockRow.idempotency_key || null,
      erro_texto: lockRow.erro_texto || null,
      response_json: lockRow.response_json || {},
    } as Json,
  });

  await supabase
    .from("assinatura_checkout_locks")
    .update({
      payload_json: {
        ...payloadAtual,
        ticket_id: ticket.id,
        ticket_numero: Number(ticket.numero || 0),
        ticket_criado_em: now,
        ticket_criado_por: params.idAdmin,
      },
      updated_at: now,
    })
    .eq("id", lockRow.id);

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "criar_ticket_checkout_reconciliacao",
    entidade: "assinatura_checkout_locks",
    entidadeId: lockRow.id,
    descricao: assunto,
    payload: {
      id_ticket: ticket.id,
      ticket_numero: Number(ticket.numero || 0),
      id_salao: lockRow.id_salao || null,
      asaas_payment_id: lockRow.asaas_payment_id || null,
      idempotency_key: lockRow.idempotency_key || null,
    },
  });

  return {
    ticketId: ticket.id,
    ticketNumero: Number(ticket.numero || 0),
    status: String(ticket.status || "aberto"),
    existed: false,
  };
}

export async function criarTicketSalaoAdminMaster(params: {
  idSalao: string;
  idAdmin: string;
  assunto: string;
  mensagem: string;
  prioridade?: string | null;
  categoria?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const assunto = normalizeText(params.assunto);
  const mensagem = normalizeText(params.mensagem);

  if (!assunto || !mensagem) {
    throw new Error("Assunto e mensagem sao obrigatorios.");
  }

  const prioridade = buildTicketPrioridade(params.prioridade);
  const categoria = buildTicketCategoria({
    tipo: params.categoria || "suporte",
    origem: "saloes",
  });

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      id_salao: params.idSalao,
      assunto,
      categoria,
      prioridade,
      status: "aberto",
      origem: "admin_master",
      id_responsavel_admin: params.idAdmin,
      solicitante_nome: "AdminMaster",
      solicitante_email: null,
      origem_contexto: {
        origem: "admin_master",
        modulo: "saloes",
        id_salao: params.idSalao,
      },
      ultima_interacao_em: now,
      atualizado_em: now,
      sla_limite_em: buildTicketSla(prioridade),
    })
    .select("id, numero, status")
    .single();

  if (ticketError || !ticketData) {
    throw new Error("Erro ao criar ticket interno do salao.");
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
    autor_nome: "AdminMaster",
    mensagem,
    interna: true,
  });

  await supabase.from("ticket_eventos").insert({
    id_ticket: ticket.id,
    evento: "ticket_aberto_admin_master",
    descricao: "Ticket aberto manualmente pelo detalhe do salao no AdminMaster.",
    payload_json: {
      id_salao: params.idSalao,
      categoria,
      prioridade,
      id_admin: params.idAdmin,
    },
  });

  await registrarAdminMasterAuditoria({
    idAdmin: params.idAdmin,
    acao: "criar_ticket_salao",
    entidade: "tickets",
    entidadeId: ticket.id,
    descricao: assunto,
    payload: {
      id_salao: params.idSalao,
      ticket_numero: Number(ticket.numero || 0),
      categoria,
      prioridade,
    },
  });

  return {
    ticketId: ticket.id,
    ticketNumero: Number(ticket.numero || 0),
    status: String(ticket.status || "aberto"),
  };
}
