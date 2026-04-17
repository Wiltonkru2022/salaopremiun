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
    },
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
