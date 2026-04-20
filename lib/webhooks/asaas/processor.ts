import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AssinaturaWebhookContextRow,
  type CobrancaWebhookResolvedRow,
} from "@/lib/webhooks/asaas/context";
import { atualizarStatusEventoWebhook } from "@/lib/webhooks/asaas/registry";
import {
  getCardSnapshot,
  getWebhookEventOrder,
  isInternalPaidStatus,
  isInternalTerminalStatus,
  isTerminalReversalEvent,
  mapAsaasStatusToInternal,
  shouldActivateAccess,
  toMiddayIso,
} from "@/lib/webhooks/asaas/status";
import {
  aplicarPagamentoConfirmado,
  aplicarStatusNaoPago,
} from "@/lib/webhooks/asaas/subscription-sync";
import type { PlanoSaasRow } from "@/lib/webhooks/asaas/types";

const NON_PAID_STATUS_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_REFUNDED",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE",
  "PAYMENT_BANK_SLIP_CANCELLED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
]);

type ProcessarWebhookAsaasParams = {
  supabaseAdmin: SupabaseClient;
  webhookEventId: string | null;
  webhookPayload: Record<string, unknown>;
  event: string;
  paymentId: string;
  payment: Record<string, unknown>;
  paymentStatus: string | null;
  billingType: string | null;
  agora: Date;
  agoraIso: string;
  cobrancaAtual: CobrancaWebhookResolvedRow;
  assinatura: AssinaturaWebhookContextRow;
  plano: PlanoSaasRow | null;
  asaasSubscriptionId: string | null;
};

type AvaliacaoEventoCobranca = {
  eventOrder: number;
  isEventoPago: boolean;
  isEventoTerminal: boolean;
  statusCobrancaInterno: string;
  cardSnapshot: ReturnType<typeof getCardSnapshot>;
  ignored: boolean;
  ignoredReason?: string;
  decisao?: string;
  confirmedDateIso: string | null;
  paymentDateIso: string | null;
};

function avaliarEventoCobranca({
  event,
  payment,
  paymentStatus,
  billingType,
  agoraIso,
  cobrancaAtual,
}: Pick<
  ProcessarWebhookAsaasParams,
  "event" | "payment" | "paymentStatus" | "billingType" | "agoraIso" | "cobrancaAtual"
>): AvaliacaoEventoCobranca {
  const statusCobrancaInterno = mapAsaasStatusToInternal(paymentStatus, event);
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
  const ignored =
    (cobrancaTemConfirmacao && !isEventoPago && !isEventoTerminal) ||
    (cobrancaEstaTerminal && !isEventoTerminal) ||
    eventoMaisAntigoQueAtual;

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

  return {
    eventOrder,
    isEventoPago,
    isEventoTerminal,
    statusCobrancaInterno,
    cardSnapshot,
    ignored,
    ignoredReason: ignored
      ? eventoMaisAntigoQueAtual
        ? "Evento mais antigo ignorado para nao regredir a cobranca."
        : "Evento regressivo ignorado porque a cobranca ja possui status final."
      : undefined,
    decisao: ignored
      ? eventoMaisAntigoQueAtual
        ? "ignored_older_event"
        : "ignored_regression_after_final_status"
      : undefined,
    confirmedDateIso,
    paymentDateIso,
  };
}

async function atualizarCobrancaWebhook(params: {
  supabaseAdmin: SupabaseClient;
  cobrancaAtual: CobrancaWebhookResolvedRow;
  webhookPayload: Record<string, unknown>;
  event: string;
  payment: Record<string, unknown>;
  paymentStatus: string | null;
  billingType: string | null;
  agoraIso: string;
  asaasSubscriptionId: string | null;
  avaliacao: AvaliacaoEventoCobranca;
}) {
  const {
    supabaseAdmin,
    cobrancaAtual,
    webhookPayload,
    event,
    payment,
    paymentStatus,
    billingType,
    agoraIso,
    asaasSubscriptionId,
    avaliacao,
  } = params;

  const { error } = await supabaseAdmin
    .from("assinaturas_cobrancas")
    .update({
      status: avaliacao.statusCobrancaInterno,
      forma_pagamento: billingType || cobrancaAtual.forma_pagamento,
      confirmed_date: avaliacao.confirmedDateIso,
      payment_date: avaliacao.paymentDateIso,
      bank_slip_url: payment.bankSlipUrl || null,
      invoice_url: payment.invoiceUrl || null,
      webhook_last_event: event,
      webhook_payload: webhookPayload,
      webhook_event_order: avaliacao.eventOrder,
      webhook_processed_at: agoraIso,
      asaas_status: paymentStatus || null,
      asaas_subscription_id:
        asaasSubscriptionId || cobrancaAtual.asaas_subscription_id || null,
      deleted: Boolean(payment.deleted),
    })
    .eq("id", cobrancaAtual.id);

  if (error) {
    throw new Error("Erro ao atualizar cobranca.");
  }
}

export async function processarWebhookAsaasResolvido(
  params: ProcessarWebhookAsaasParams
) {
  const avaliacao = avaliarEventoCobranca(params);

  if (avaliacao.ignored) {
    await atualizarStatusEventoWebhook(
      params.supabaseAdmin,
      params.webhookEventId,
      "processado",
      null,
      {
        id_salao: params.cobrancaAtual.id_salao || params.assinatura.id_salao,
        id_assinatura: params.assinatura.id,
        id_cobranca: params.cobrancaAtual.id,
        event_order: avaliacao.eventOrder,
        decisao: avaliacao.decisao,
      }
    );

    return {
      ok: true,
      ignored: true,
      reason: avaliacao.ignoredReason,
      event: params.event,
    };
  }

  try {
    await atualizarCobrancaWebhook({
      supabaseAdmin: params.supabaseAdmin,
      cobrancaAtual: params.cobrancaAtual,
      webhookPayload: params.webhookPayload,
      event: params.event,
      payment: params.payment,
      paymentStatus: params.paymentStatus,
      billingType: params.billingType,
      agoraIso: params.agoraIso,
      asaasSubscriptionId: params.asaasSubscriptionId,
      avaliacao,
    });
  } catch (error) {
    await atualizarStatusEventoWebhook(
      params.supabaseAdmin,
      params.webhookEventId,
      "erro",
      error instanceof Error ? error.message : "Erro ao atualizar cobranca."
    );
    throw error;
  }

  if (avaliacao.isEventoPago) {
    const result = await aplicarPagamentoConfirmado({
      supabaseAdmin: params.supabaseAdmin,
      webhookEventId: params.webhookEventId,
      cobrancaAtual: params.cobrancaAtual,
      assinatura: params.assinatura,
      plano: params.plano,
      billingType: params.billingType,
      paymentId: params.paymentId,
      paymentDateIso: avaliacao.paymentDateIso,
      agora: params.agora,
      agoraIso: params.agoraIso,
      asaasSubscriptionId: params.asaasSubscriptionId,
      cardSnapshot: avaliacao.cardSnapshot,
      eventOrder: avaliacao.eventOrder,
    });

    return { ok: true, ...result };
  }

  if (
    NON_PAID_STATUS_EVENTS.has(params.event) ||
    avaliacao.isEventoTerminal
  ) {
    const result = await aplicarStatusNaoPago({
      supabaseAdmin: params.supabaseAdmin,
      webhookEventId: params.webhookEventId,
      cobrancaAtual: params.cobrancaAtual,
      assinatura: params.assinatura,
      event: params.event,
      eventOrder: avaliacao.eventOrder,
      agoraIso: params.agoraIso,
      isEventoTerminal: avaliacao.isEventoTerminal,
    });

    return { ok: true, ...result };
  }

  await atualizarStatusEventoWebhook(
    params.supabaseAdmin,
    params.webhookEventId,
    "processado",
    null,
    {
      id_salao: params.cobrancaAtual.id_salao || params.assinatura.id_salao,
      id_assinatura: params.assinatura.id,
      id_cobranca: params.cobrancaAtual.id,
      event_order: avaliacao.eventOrder,
      decisao: "ignored_unhandled_event",
    }
  );

  return { ok: true, ignored: true, event: params.event };
}
