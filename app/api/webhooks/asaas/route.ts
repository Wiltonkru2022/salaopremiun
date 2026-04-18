import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { addDays, isAfter } from "date-fns";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyHeaderSecret } from "@/lib/auth/verify-secret";
import { registrarLogSistema } from "@/lib/system-logs";

type PlanoSaasRow = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
  ativo: boolean;
};

type WebhookRegistroRow = {
  id: string;
  should_process: boolean;
  status_processamento: string;
  tentativas: number;
};

type WebhookEventoExistenteRow = {
  id: string;
  status_processamento: string | null;
  tentativas: number | null;
  erro_mensagem?: string | null;
  processado_em?: string | null;
};

const PAID_ASAAS_STATUSES = new Set([
  "RECEIVED",
  "CONFIRMED",
  "RECEIVED_IN_CASH",
]);

const PAID_ASAAS_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_RECEIVED_IN_CASH",
]);

const TERMINAL_REVERSAL_EVENTS = new Set([
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE",
  "PAYMENT_BANK_SLIP_CANCELLED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
]);

const TERMINAL_REVERSAL_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_RECEIVED",
  "AWAITING_CHARGEBACK_REVERSAL",
  "DUNNING_REQUESTED",
  "DUNNING_RECEIVED",
  "DUNNING_RETURNED",
  "CANCELLED",
]);

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function validarTokenWebhook(req: Request) {
  const tokenHeader =
    req.headers.get("asaas-access-token") ||
    req.headers.get("access_token");

  return verifyHeaderSecret(tokenHeader, process.env.ASAAS_WEBHOOK_TOKEN);
}

function shouldActivateAccess(event: string, billingType?: string | null) {
  const type = String(billingType || "").toUpperCase();

  if (type === "CREDIT_CARD") {
    return PAID_ASAAS_EVENTS.has(event);
  }

  if (type === "BOLETO") {
    return PAID_ASAAS_EVENTS.has(event);
  }

  if (type === "PIX") {
    return PAID_ASAAS_EVENTS.has(event);
  }

  return PAID_ASAAS_EVENTS.has(event);
}

function isTerminalReversalEvent(event: string, status?: string | null) {
  const normalizedStatus = String(status || "").toUpperCase();

  return (
    TERMINAL_REVERSAL_EVENTS.has(event) ||
    TERMINAL_REVERSAL_STATUSES.has(normalizedStatus)
  );
}

function isInternalPaidStatus(status?: string | null) {
  return ["ativo", "ativa", "pago", "paid", "received", "confirmed"].includes(
    String(status || "").toLowerCase()
  );
}

function isInternalTerminalStatus(status?: string | null) {
  return ["cancelada", "cancelado", "cancelled", "refunded", "estornado"].includes(
    String(status || "").toLowerCase()
  );
}

function getWebhookEventOrder(event: string, status?: string | null) {
  const normalizedStatus = String(status || "").toUpperCase();

  if (isTerminalReversalEvent(event, normalizedStatus)) {
    return 120;
  }

  if (PAID_ASAAS_EVENTS.has(event) || PAID_ASAAS_STATUSES.has(normalizedStatus)) {
    return 100;
  }

  if (event === "PAYMENT_OVERDUE" || normalizedStatus === "OVERDUE") {
    return 60;
  }

  if (event === "PAYMENT_RESTORED" || normalizedStatus === "PENDING") {
    return 40;
  }

  return 20;
}

function mapAsaasStatusToInternal(
  status?: string | null,
  event?: string | null
) {
  const normalized = String(status || "").toUpperCase();
  const normalizedEvent = String(event || "").toUpperCase();

  if (PAID_ASAAS_EVENTS.has(normalizedEvent) || PAID_ASAAS_STATUSES.has(normalized)) {
    return "ativo";
  }

  if (isTerminalReversalEvent(normalizedEvent, normalized)) {
    return "cancelada";
  }

  if (normalizedEvent === "PAYMENT_OVERDUE") {
    return "vencida";
  }

  if (normalizedEvent === "PAYMENT_RESTORED") {
    return "pendente";
  }

  if (["PENDING"].includes(normalized)) {
    return "pendente";
  }

  if (["OVERDUE"].includes(normalized)) {
    return "vencida";
  }

  return "pendente";
}

function toMiddayIso(dateOnly?: string | null) {
  if (!dateOnly) return null;

  const value = String(dateOnly).trim();
  if (!value) return null;

  const iso = new Date(`${value}T12:00:00`);
  if (Number.isNaN(iso.getTime())) return null;

  return iso.toISOString();
}

function buildWebhookFingerprint(
  event: string,
  payment: Record<string, unknown>
) {
  const fingerprintSource = JSON.stringify({
    event,
    paymentId: String(payment.id || ""),
    status: String(payment.status || ""),
    billingType: String(payment.billingType || ""),
    confirmedDate: String(payment.confirmedDate || ""),
    paymentDate: String(payment.paymentDate || ""),
    clientPaymentDate: String(payment.clientPaymentDate || ""),
    dueDate: String(payment.dueDate || ""),
    deleted: Boolean(payment.deleted),
    value: String(payment.value || ""),
  });

  return createHash("sha256").update(fingerprintSource).digest("hex");
}

function buildWebhookIdempotencyKey(
  body: Record<string, unknown>,
  event: string,
  paymentId: string,
  fingerprint: string
) {
  return (
    String(body.id || "").trim() ||
    `${paymentId}:${event}` ||
    fingerprint
  );
}

async function buscarEventoWebhookExistente(
  supabaseAdmin: SupabaseClient,
  fingerprint: string,
  idempotenciaKey: string
) {
  const { data: porFingerprint, error: fingerprintError } = await supabaseAdmin
    .from("asaas_webhook_eventos")
    .select(
      "id, status_processamento, tentativas, erro_mensagem, processado_em"
    )
    .eq("fingerprint", fingerprint)
    .maybeSingle<WebhookEventoExistenteRow>();

  if (fingerprintError) {
    throw fingerprintError;
  }

  if (porFingerprint?.id) {
    return porFingerprint;
  }

  const { data: porIdempotencia, error: idempotenciaError } =
    await supabaseAdmin
      .from("asaas_webhook_eventos")
      .select(
        "id, status_processamento, tentativas, erro_mensagem, processado_em"
      )
      .eq("idempotencia_key", idempotenciaKey)
      .maybeSingle<WebhookEventoExistenteRow>();

  if (idempotenciaError) {
    throw idempotenciaError;
  }

  return porIdempotencia;
}

async function registrarEventoWebhookAsaas(params: {
  supabaseAdmin: SupabaseClient;
  fingerprint: string;
  body: Record<string, unknown>;
  event: string;
  paymentId: string;
  paymentStatus: string;
}) {
  const agoraIso = new Date().toISOString();
  const idempotenciaKey = buildWebhookIdempotencyKey(
    params.body,
    params.event,
    params.paymentId,
    params.fingerprint
  );
  const eventOrder = getWebhookEventOrder(params.event, params.paymentStatus);

  const { data: inserted, error: insertError } = await params.supabaseAdmin
    .from("asaas_webhook_eventos")
    .insert({
      fingerprint: params.fingerprint,
      idempotencia_key: idempotenciaKey,
      event_type: params.event,
      evento: params.event,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus || null,
      status_processamento: "processando",
      tentativas: 1,
      payload: params.body,
      erro_mensagem: null,
      primeiro_recebido_em: agoraIso,
      ultimo_recebido_em: agoraIso,
      updated_at: agoraIso,
      event_order: eventOrder,
    })
    .select("id, status_processamento, tentativas")
    .single();

  if (!insertError && inserted?.id) {
    return {
      id: inserted.id,
      should_process: true,
      status_processamento: inserted.status_processamento || "processando",
      tentativas: Number(inserted.tentativas || 1),
    } satisfies WebhookRegistroRow;
  }

  if (insertError?.code !== "23505") {
    throw insertError;
  }

  const existente = await buscarEventoWebhookExistente(
    params.supabaseAdmin,
    params.fingerprint,
    idempotenciaKey
  );

  if (!existente?.id) {
    throw insertError;
  }

  const statusAnterior = String(existente.status_processamento || "processando");
  const tentativasAtualizadas = Number(existente.tentativas || 0) + 1;

  const { data: updated, error: updateError } = await params.supabaseAdmin
    .from("asaas_webhook_eventos")
    .update({
      fingerprint: params.fingerprint,
      idempotencia_key: idempotenciaKey,
      event_type: params.event,
      evento: params.event,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus || null,
      payload: params.body,
      tentativas: tentativasAtualizadas,
      ultimo_recebido_em: agoraIso,
      updated_at: agoraIso,
      event_order: eventOrder,
      status_processamento:
        statusAnterior === "erro" ? "processando" : statusAnterior,
      erro_mensagem: statusAnterior === "erro" ? null : existente.erro_mensagem || null,
      processado_em: statusAnterior === "erro" ? null : existente.processado_em || null,
    })
    .eq("id", existente.id)
    .select("id, status_processamento, tentativas")
    .single();

  if (updateError || !updated?.id) {
    throw updateError || new Error("Erro ao atualizar evento duplicado do webhook.");
  }

  return {
    id: updated.id,
    should_process: statusAnterior === "erro",
    status_processamento: updated.status_processamento || statusAnterior,
    tentativas: Number(updated.tentativas || tentativasAtualizadas),
  } satisfies WebhookRegistroRow;
}

async function atualizarStatusEventoWebhook(
  supabaseAdmin: SupabaseClient,
  webhookEventId: string | null,
  statusProcessamento: "processado" | "erro",
  errorMessage?: string | null,
  extra?: Record<string, unknown>
) {
  if (!webhookEventId) return;

  const agoraIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status_processamento: statusProcessamento,
    erro_mensagem: errorMessage || null,
    updated_at: agoraIso,
  };

  if (statusProcessamento === "processado") {
    payload.processado_em = agoraIso;
  }

  Object.assign(payload, extra || {});

  const { error } = await supabaseAdmin
    .from("asaas_webhook_eventos")
    .update(payload)
    .eq("id", webhookEventId);

  if (error) {
    console.error("Erro ao atualizar log do webhook Asaas:", error);
  }
}

async function registrarFalhaWebhookFallback(params: {
  supabaseAdmin: SupabaseClient;
  webhookPayload: Record<string, unknown>;
  event: string;
  paymentId: string;
  paymentStatus: string | null;
  errorMessage: string;
}) {
  const agoraIso = new Date().toISOString();

  const { data: cobranca } = await params.supabaseAdmin
    .from("assinaturas_cobrancas")
    .select("id, id_salao, id_assinatura")
    .eq("asaas_payment_id", params.paymentId)
    .maybeSingle();

  const idSalao = String(cobranca?.id_salao || "").trim() || null;
  const eventId = String(params.webhookPayload.id || "").trim();
  const chaveEvento = `fallback:asaas:${eventId || params.paymentId}:${params.event}`;

  await registrarLogSistema({
    gravidade: "error",
    modulo: "webhook_asaas",
    idSalao,
    mensagem: "Falha ao registrar evento inicial do webhook Asaas.",
    detalhes: {
      origem_registro: "fallback_webhook_registration_error",
      event_id: eventId || null,
      event: params.event,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus,
      erro_mensagem: params.errorMessage,
    },
  });

  const payloadFallback = {
    origem_registro: "fallback_webhook_registration_error",
    event_id: eventId || null,
    payment_id: params.paymentId,
    payment_status: params.paymentStatus,
    webhook_payload: params.webhookPayload,
  };

  await params.supabaseAdmin.from("eventos_webhook").upsert(
    {
      chave: chaveEvento,
      origem: "asaas",
      evento: params.event || "evento_desconhecido",
      id_salao: idSalao,
      status: "erro",
      payload_json: payloadFallback,
      resposta_json: {
        status_processamento: "erro_registro_inicial",
        payment_id: params.paymentId,
      },
      erro_texto: params.errorMessage,
      tentativas: 1,
      recebido_em: agoraIso,
      processado_em: null,
      automatico: true,
      atualizado_em: agoraIso,
    },
    { onConflict: "chave" }
  );

  await params.supabaseAdmin.from("alertas_sistema").upsert(
    {
      chave: `alerta:${chaveEvento}`,
      tipo: "webhook_asaas_erro",
      gravidade: "critica",
      origem_modulo: "webhooks",
      id_salao: idSalao,
      titulo: "Webhook Asaas falhou antes do registro",
      descricao: `Falha ao registrar o evento ${params.event || "-"} para o pagamento ${params.paymentId}.`,
      payload_json: {
        ...payloadFallback,
        id_cobranca: cobranca?.id || null,
        id_assinatura: cobranca?.id_assinatura || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: agoraIso,
    },
    { onConflict: "chave" }
  );
}

function getCardSnapshot(payment: Record<string, unknown>) {
  const creditCard =
    payment.creditCard && typeof payment.creditCard === "object"
      ? (payment.creditCard as Record<string, unknown>)
      : null;

  return {
    token: String(creditCard?.creditCardToken || "").trim() || null,
    brand: String(creditCard?.creditCardBrand || "").trim() || null,
    last4: String(creditCard?.creditCardNumber || "").trim() || null,
    tokenizedAt: creditCard?.creditCardToken ? new Date().toISOString() : null,
  };
}

async function criarCobrancaWebhookDeAssinaturaRecorrente(params: {
  supabaseAdmin: SupabaseClient;
  asaasSubscriptionId: string;
  paymentId: string;
  payment: Record<string, unknown>;
  body: Record<string, unknown>;
  billingType: string | null;
  paymentStatus: string | null;
  event: string;
  agoraIso: string;
}) {
  const { data: assinatura, error: assinaturaError } = await params.supabaseAdmin
    .from("assinaturas")
    .select("id, id_salao, plano, valor, asaas_subscription_id")
    .eq("asaas_subscription_id", params.asaasSubscriptionId)
    .maybeSingle();

  if (assinaturaError || !assinatura?.id || !assinatura.id_salao) {
    return null;
  }

  const { data: existente } = await params.supabaseAdmin
    .from("assinaturas_cobrancas")
    .select(
      "id, id_salao, id_assinatura, id_plano, valor, status, forma_pagamento, asaas_payment_id, data_expiracao, referencia, payment_date, confirmed_date, plano_origem, plano_destino, tipo_movimento, gerada_automaticamente, webhook_event_order, webhook_processed_at, asaas_status, asaas_subscription_id"
    )
    .eq("asaas_payment_id", params.paymentId)
    .maybeSingle();

  if (existente?.id) {
    return existente;
  }

  const planoCodigo = String(assinatura.plano || "").trim() || null;
  const { data: plano } = planoCodigo
    ? await params.supabaseAdmin
        .from("planos_saas")
        .select("id, codigo, nome")
        .eq("codigo", planoCodigo)
        .maybeSingle()
    : { data: null };

  const statusInterno = mapAsaasStatusToInternal(
    params.paymentStatus,
    params.event
  );
  const eventOrder = getWebhookEventOrder(params.event, params.paymentStatus);
  const confirmedDateIso =
    toMiddayIso(String(params.payment.confirmedDate || "")) ||
    toMiddayIso(String(params.payment.paymentDate || "")) ||
    toMiddayIso(String(params.payment.clientPaymentDate || "")) ||
    null;
  const paymentDateIso =
    toMiddayIso(String(params.payment.clientPaymentDate || "")) ||
    toMiddayIso(String(params.payment.paymentDate || "")) ||
    toMiddayIso(String(params.payment.confirmedDate || "")) ||
    null;

  const { data: inserted, error: insertError } = await params.supabaseAdmin
    .from("assinaturas_cobrancas")
    .insert({
      id_salao: assinatura.id_salao,
      id_assinatura: assinatura.id,
      id_plano: plano?.id || null,
      referencia:
        String(params.payment.invoiceNumber || "").trim() || params.paymentId,
      descricao:
        String(params.payment.description || "").trim() ||
        `Renovacao ${plano?.nome || planoCodigo || "SalaoPremium"} - SalaoPremium`,
      valor: Number(params.payment.value || assinatura.valor || 0),
      status: statusInterno,
      forma_pagamento: params.billingType || null,
      gateway: "asaas",
      txid: params.billingType === "PIX" ? params.paymentId : null,
      asaas_payment_id: params.paymentId,
      asaas_customer_id: String(params.payment.customer || "").trim() || null,
      asaas_subscription_id: params.asaasSubscriptionId,
      payment_date: paymentDateIso,
      confirmed_date: confirmedDateIso,
      invoice_url: params.payment.invoiceUrl || null,
      bank_slip_url: params.payment.bankSlipUrl || null,
      data_expiracao: String(params.payment.dueDate || "").trim() || null,
      external_reference:
        String(params.payment.externalReference || "").trim() ||
        assinatura.id_salao,
      webhook_payload: params.body,
      webhook_last_event: params.event,
      webhook_event_order: eventOrder,
      webhook_processed_at: params.agoraIso,
      asaas_status: params.paymentStatus || null,
      deleted: Boolean(params.payment.deleted),
      plano_origem: planoCodigo,
      plano_destino: planoCodigo,
      tipo_movimento: "renovacao",
      gerada_automaticamente: true,
      metadata: {
        origem: "asaas_subscription_webhook",
        asaas_subscription_id: params.asaasSubscriptionId,
        billingType: params.billingType,
      },
    })
    .select(
      "id, id_salao, id_assinatura, id_plano, valor, status, forma_pagamento, asaas_payment_id, data_expiracao, referencia, payment_date, confirmed_date, plano_origem, plano_destino, tipo_movimento, gerada_automaticamente, webhook_event_order, webhook_processed_at, asaas_status, asaas_subscription_id"
    )
    .single();

  if (insertError || !inserted?.id) {
    throw insertError || new Error("Erro ao materializar cobranca recorrente.");
  }

  return inserted;
}

export async function POST(req: Request) {
  let supabaseAdmin: SupabaseClient | null = null;
  let webhookEventId: string | null = null;
  let webhookPayload: Record<string, unknown> | null = null;
  let event = "";
  let paymentId = "";
  let paymentStatus: string | null = null;

  try {
    supabaseAdmin = getSupabaseAdmin();

    if (!validarTokenWebhook(req)) {
      return NextResponse.json(
        { error: "Webhook nao autorizado." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    webhookPayload = body;
    event = String(body?.event || "");
    const payment = body?.payment as Record<string, unknown> | undefined;

    if (!payment?.id) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "no_payment_id",
      });
    }

    paymentId = String(payment.id);
    const billingType = String(payment.billingType || "").toUpperCase() || null;
    const asaasSubscriptionId =
      String(payment.subscription || "").trim() || null;
    paymentStatus = String(payment.status || "").toUpperCase();
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const webhookFingerprint = buildWebhookFingerprint(event, payment);

    let webhookRegistro: WebhookRegistroRow | null = null;

    try {
      webhookRegistro = await registrarEventoWebhookAsaas({
        supabaseAdmin,
        fingerprint: webhookFingerprint,
        body,
        event,
        paymentId,
        paymentStatus,
      });
    } catch (webhookRegistroError) {
      console.error("Erro ao registrar evento do webhook:", webhookRegistroError);
      const webhookRegistroErrorMessage =
        webhookRegistroError instanceof Error
          ? webhookRegistroError.message
          : "Erro ao registrar evento do webhook.";
      await registrarFalhaWebhookFallback({
        supabaseAdmin,
        webhookPayload: body,
        event,
        paymentId,
        paymentStatus,
        errorMessage: webhookRegistroErrorMessage,
      });
      return NextResponse.json(
        { error: "Erro ao registrar evento do webhook." },
        { status: 500 }
      );
    }

    webhookEventId = webhookRegistro?.id || null;

    if (!webhookRegistro?.should_process) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason:
          webhookRegistro?.status_processamento === "processado"
            ? "duplicate_event"
            : "event_in_processing",
        event,
      });
    }

    const { data: cobranca, error: cobrancaError } = await supabaseAdmin
      .from("assinaturas_cobrancas")
      .select(`
        id,
        id_salao,
        id_assinatura,
        id_plano,
        valor,
        status,
        forma_pagamento,
        asaas_payment_id,
        data_expiracao,
        referencia,
        payment_date,
        confirmed_date,
        plano_origem,
        plano_destino,
        tipo_movimento,
        gerada_automaticamente,
        webhook_event_order,
        webhook_processed_at,
        asaas_status,
        asaas_subscription_id
      `)
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (cobrancaError) {
      console.error("Erro ao buscar cobranca:", cobrancaError);
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao buscar cobranca."
      );
      return NextResponse.json(
        { error: "Erro ao buscar cobranca." },
        { status: 500 }
      );
    }

    let cobrancaAtual = cobranca;

    if (!cobrancaAtual && asaasSubscriptionId) {
      cobrancaAtual = await criarCobrancaWebhookDeAssinaturaRecorrente({
        supabaseAdmin,
        asaasSubscriptionId,
        paymentId,
        payment,
        body,
        billingType,
        paymentStatus,
        event,
        agoraIso,
      });
    }

    if (!cobrancaAtual) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "charge_not_found"
      );
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "charge_not_found",
      });
    }

    if (!cobrancaAtual.id_assinatura) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Cobranca sem id_assinatura vinculado."
      );
      return NextResponse.json(
        { error: "Cobranca sem id_assinatura vinculada." },
        { status: 500 }
      );
    }

    const { data: assinatura, error: assinaturaError } = await supabaseAdmin
      .from("assinaturas")
      .select(`
        id,
        id_salao,
        plano,
        status,
        valor,
        vencimento_em,
        trial_ativo,
        trial_inicio_em,
        trial_fim_em,
        limite_profissionais,
        limite_usuarios,
        created_at,
        asaas_subscription_id,
        asaas_credit_card_token,
        asaas_credit_card_brand,
        asaas_credit_card_last4,
        asaas_credit_card_tokenized_at
      `)
      .eq("id", cobrancaAtual.id_assinatura)
      .maybeSingle();

    if (assinaturaError || !assinatura) {
      console.error("Erro ao buscar assinatura:", assinaturaError);
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao buscar assinatura."
      );
      return NextResponse.json(
        { error: "Erro ao buscar assinatura." },
        { status: 500 }
      );
    }

    let plano: PlanoSaasRow | null = null;

    if (cobrancaAtual.id_plano) {
      const { data: planoData, error: planoError } = await supabaseAdmin
        .from("planos_saas")
        .select(`
          id,
          codigo,
          nome,
          descricao,
          valor_mensal,
          limite_usuarios,
          limite_profissionais,
          ativo
        `)
        .eq("id", cobrancaAtual.id_plano)
        .eq("ativo", true)
        .maybeSingle();

      if (planoError) {
        console.error("Erro ao buscar plano no webhook:", planoError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao buscar plano."
        );
        return NextResponse.json(
          { error: "Erro ao buscar plano." },
          { status: 500 }
        );
      }

      plano = (planoData as PlanoSaasRow | null) || null;
    }

    const statusCobrancaInterno = mapAsaasStatusToInternal(
      paymentStatus,
      event
    );
    const cardSnapshot = getCardSnapshot(payment);
    const isEventoPago = shouldActivateAccess(event, billingType);
    const isEventoTerminal = isTerminalReversalEvent(event, paymentStatus);
    const eventOrder = getWebhookEventOrder(event, paymentStatus);
    const cobrancaWebhookOrder = Number(cobrancaAtual.webhook_event_order || 0);
    const cobrancaTemConfirmacao =
      isInternalPaidStatus(cobrancaAtual.status) ||
      Boolean(cobrancaAtual.confirmed_date) ||
      Boolean(cobrancaAtual.payment_date);
    const cobrancaEstaTerminal = isInternalTerminalStatus(cobrancaAtual.status);
    const eventoMaisAntigoQueAtual =
      cobrancaWebhookOrder > 0 && eventOrder < cobrancaWebhookOrder;
    const deveIgnorarEvento =
      (cobrancaTemConfirmacao && !isEventoPago && !isEventoTerminal) ||
      (cobrancaEstaTerminal && !isEventoTerminal) ||
      eventoMaisAntigoQueAtual;

    if (deveIgnorarEvento) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "processado",
        null,
        {
          id_salao: cobrancaAtual.id_salao || assinatura.id_salao,
          id_assinatura: assinatura.id,
          id_cobranca: cobrancaAtual.id,
          event_order: eventOrder,
          decisao: eventoMaisAntigoQueAtual
            ? "ignored_older_event"
            : "ignored_regression_after_final_status",
        }
      );
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: eventoMaisAntigoQueAtual
          ? "Evento mais antigo ignorado para nao regredir a cobranca."
          : "Evento regressivo ignorado porque a cobranca ja possui status final.",
        event,
      });
    }

    const confirmedDateIso = isEventoPago
      ? toMiddayIso(String(payment.confirmedDate || "")) ||
        toMiddayIso(String(payment.paymentDate || "")) ||
        toMiddayIso(String(payment.clientPaymentDate || "")) ||
        cobrancaAtual.confirmed_date ||
        agoraIso
      : toMiddayIso(String(payment.confirmedDate || "")) ||
        cobrancaAtual.confirmed_date ||
        null;

    const paymentDateIso = isEventoPago
      ? toMiddayIso(String(payment.clientPaymentDate || "")) ||
        toMiddayIso(String(payment.paymentDate || "")) ||
        toMiddayIso(String(payment.confirmedDate || "")) ||
        cobrancaAtual.payment_date ||
        agoraIso
      : toMiddayIso(String(payment.clientPaymentDate || "")) ||
        toMiddayIso(String(payment.paymentDate || "")) ||
        cobrancaAtual.payment_date ||
        null;

    const { error: updateChargeError } = await supabaseAdmin
      .from("assinaturas_cobrancas")
      .update({
        status: statusCobrancaInterno,
        forma_pagamento: billingType || cobrancaAtual.forma_pagamento,
        confirmed_date: confirmedDateIso,
        payment_date: paymentDateIso,
        bank_slip_url: payment.bankSlipUrl || null,
        invoice_url: payment.invoiceUrl || null,
        webhook_last_event: event,
        webhook_payload: body,
        webhook_event_order: eventOrder,
        webhook_processed_at: agoraIso,
        asaas_status: paymentStatus || null,
        asaas_subscription_id:
          asaasSubscriptionId ||
          cobrancaAtual.asaas_subscription_id ||
          null,
        deleted: Boolean(payment.deleted),
      })
      .eq("id", cobrancaAtual.id);

    if (updateChargeError) {
      console.error("Erro ao atualizar cobranca:", updateChargeError);
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao atualizar cobranca."
      );
      return NextResponse.json(
        { error: "Erro ao atualizar cobranca." },
        { status: 500 }
      );
    }

    if (isEventoPago) {
      let baseDate = agora;

      if (assinatura.vencimento_em) {
        const vencimentoAtual = new Date(`${assinatura.vencimento_em}T23:59:59`);

        if (
          !Number.isNaN(vencimentoAtual.getTime()) &&
          isAfter(vencimentoAtual, agora)
        ) {
          baseDate = vencimentoAtual;
        }
      } else if (assinatura.trial_fim_em) {
        const trialFimAtual = new Date(assinatura.trial_fim_em);

        if (
          !Number.isNaN(trialFimAtual.getTime()) &&
          isAfter(trialFimAtual, agora)
        ) {
          baseDate = trialFimAtual;
        }
      }

      const novoFim = addDays(baseDate, 30);
      const novoVencimentoBanco = novoFim.toISOString().slice(0, 10);

      const planoCodigoFinal = plano?.codigo || assinatura.plano || null;
      const valorPlanoFinal =
        plano != null
          ? Number(plano.valor_mensal || 0)
          : Number(assinatura.valor || 0);
      const limiteUsuariosFinal =
        plano != null
          ? Number(plano.limite_usuarios || 0)
          : Number(assinatura.limite_usuarios || 0);
      const limiteProfissionaisFinal =
        plano != null
          ? Number(plano.limite_profissionais || 0)
          : Number(assinatura.limite_profissionais || 0);

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "ativo",
          plano: planoCodigoFinal,
          valor: valorPlanoFinal,
          pago_em: paymentDateIso || agoraIso,
          vencimento_em: novoVencimentoBanco,
          trial_ativo: false,
          trial_inicio_em: null,
          trial_fim_em: null,
          limite_profissionais: limiteProfissionaisFinal,
          limite_usuarios: limiteUsuariosFinal,
          forma_pagamento_atual: billingType || cobrancaAtual.forma_pagamento,
          gateway: "asaas",
          asaas_payment_id: paymentId,
          referencia_atual: cobrancaAtual.referencia || paymentId,
          id_cobranca_atual: cobrancaAtual.id,
          asaas_subscription_id:
            asaasSubscriptionId || assinatura.asaas_subscription_id || null,
          asaas_credit_card_token:
            cardSnapshot.token || assinatura.asaas_credit_card_token || null,
          asaas_credit_card_brand:
            cardSnapshot.brand || assinatura.asaas_credit_card_brand || null,
          asaas_credit_card_last4:
            cardSnapshot.last4 || assinatura.asaas_credit_card_last4 || null,
          asaas_credit_card_tokenized_at:
            cardSnapshot.tokenizedAt ||
            assinatura.asaas_credit_card_tokenized_at ||
            null,
        })
        .eq("id", assinatura.id);

      if (updateAssinaturaError) {
        console.error("Erro ao atualizar assinatura:", updateAssinaturaError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar assinatura."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar assinatura." },
          { status: 500 }
        );
      }

      const { error: updateSalaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          status: "ativo",
          plano: planoCodigoFinal,
          trial_ativo: false,
          trial_inicio_em: null,
          trial_fim_em: null,
          limite_profissionais: limiteProfissionaisFinal,
          limite_usuarios: limiteUsuariosFinal,
          updated_at: agoraIso,
        })
        .eq("id", assinatura.id_salao);

      if (updateSalaoError) {
        console.error("Erro ao atualizar salao:", updateSalaoError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar salao."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar salao." },
          { status: 500 }
        );
      }

      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "processado",
        null,
        {
          id_salao: cobrancaAtual.id_salao || assinatura.id_salao,
          id_assinatura: assinatura.id,
          id_cobranca: cobrancaAtual.id,
          event_order: eventOrder,
          decisao: "paid_applied",
        }
      );
      return NextResponse.json({ ok: true, updated: "paid" });
    }

    if (
      event === "PAYMENT_OVERDUE" ||
      event === "PAYMENT_DELETED" ||
      event === "PAYMENT_RESTORED" ||
      event === "PAYMENT_REFUNDED" ||
      event === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
      event === "PAYMENT_BANK_SLIP_CANCELLED" ||
      event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED" ||
      isEventoTerminal
    ) {
      let novoStatus = assinatura.status || "pendente";

      if (event === "PAYMENT_OVERDUE") {
        novoStatus = "vencida";
      }

      if (
        event === "PAYMENT_DELETED" ||
        event === "PAYMENT_REFUNDED" ||
        event === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
        event === "PAYMENT_BANK_SLIP_CANCELLED" ||
        event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED" ||
        isEventoTerminal
      ) {
        novoStatus = "cancelada";
      }

      if (event === "PAYMENT_RESTORED") {
        novoStatus = "pendente";
      }

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: novoStatus,
          trial_ativo: false,
          id_cobranca_atual: cobrancaAtual.id,
        })
        .eq("id", assinatura.id);

      if (updateAssinaturaError) {
        console.error("Erro ao atualizar assinatura:", updateAssinaturaError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar assinatura."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar assinatura." },
          { status: 500 }
        );
      }

      const { error: updateSalaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          status: novoStatus,
          trial_ativo: false,
          updated_at: agoraIso,
        })
        .eq("id", assinatura.id_salao);

      if (updateSalaoError) {
        console.error("Erro ao atualizar salao:", updateSalaoError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar salao."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar salao." },
          { status: 500 }
        );
      }

      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "processado",
        null,
        {
          id_salao: cobrancaAtual.id_salao || assinatura.id_salao,
          id_assinatura: assinatura.id,
          id_cobranca: cobrancaAtual.id,
          event_order: eventOrder,
          decisao: `status_applied_${novoStatus}`,
        }
      );
      return NextResponse.json({ ok: true, updated: novoStatus });
    }

    await atualizarStatusEventoWebhook(
      supabaseAdmin,
      webhookEventId,
      "processado",
      null,
      {
        id_salao: cobrancaAtual.id_salao || assinatura.id_salao,
        id_assinatura: assinatura.id,
        id_cobranca: cobrancaAtual.id,
        event_order: eventOrder,
        decisao: "ignored_unhandled_event",
      }
    );
    return NextResponse.json({ ok: true, ignored: true, event });
  } catch (error) {
    console.error("Erro webhook:", error);

    if (supabaseAdmin) {
      if (!webhookEventId && webhookPayload && paymentId) {
        await registrarFalhaWebhookFallback({
          supabaseAdmin,
          webhookPayload,
          event,
          paymentId,
          paymentStatus,
          errorMessage: error instanceof Error ? error.message : "Erro webhook",
        });
      }

      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        error instanceof Error ? error.message : "Erro webhook"
      );
    }

    return NextResponse.json({ error: "Erro webhook" }, { status: 500 });
  }
}
