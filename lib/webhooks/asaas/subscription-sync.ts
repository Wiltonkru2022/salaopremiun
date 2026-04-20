import { addDays, isAfter } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { atualizarStatusEventoWebhook } from "@/lib/webhooks/asaas/registry";
import type { PlanoSaasRow } from "@/lib/webhooks/asaas/types";

type CobrancaWebhookRow = {
  id: string;
  id_salao?: string | null;
  id_assinatura: string;
  id_plano?: string | null;
  status?: string | null;
  forma_pagamento?: string | null;
  referencia?: string | null;
  confirmed_date?: string | null;
  payment_date?: string | null;
  asaas_subscription_id?: string | null;
};

type AssinaturaWebhookRow = {
  id: string;
  id_salao: string;
  plano?: string | null;
  status?: string | null;
  valor?: number | string | null;
  vencimento_em?: string | null;
  trial_fim_em?: string | null;
  limite_profissionais?: number | string | null;
  limite_usuarios?: number | string | null;
  asaas_subscription_id?: string | null;
  asaas_credit_card_token?: string | null;
  asaas_credit_card_brand?: string | null;
  asaas_credit_card_last4?: string | null;
  asaas_credit_card_tokenized_at?: string | null;
};

type CardSnapshot = {
  token: string | null;
  brand: string | null;
  last4: string | null;
  tokenizedAt: string | null;
};

export async function aplicarPagamentoConfirmado(params: {
  supabaseAdmin: SupabaseClient;
  webhookEventId: string | null;
  cobrancaAtual: CobrancaWebhookRow;
  assinatura: AssinaturaWebhookRow;
  plano: PlanoSaasRow | null;
  billingType: string | null;
  paymentId: string;
  paymentDateIso: string | null;
  agora: Date;
  agoraIso: string;
  asaasSubscriptionId: string | null;
  cardSnapshot: CardSnapshot;
  eventOrder: number;
}) {
  const {
    supabaseAdmin,
    webhookEventId,
    cobrancaAtual,
    assinatura,
    plano,
    billingType,
    paymentId,
    paymentDateIso,
    agora,
    agoraIso,
    asaasSubscriptionId,
    cardSnapshot,
    eventOrder,
  } = params;

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
    plano != null ? Number(plano.valor_mensal || 0) : Number(assinatura.valor || 0);
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
    await atualizarStatusEventoWebhook(
      supabaseAdmin,
      webhookEventId,
      "erro",
      "Erro ao atualizar assinatura."
    );
    throw updateAssinaturaError;
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
    await atualizarStatusEventoWebhook(
      supabaseAdmin,
      webhookEventId,
      "erro",
      "Erro ao atualizar salao."
    );
    throw updateSalaoError;
  }

  await atualizarStatusEventoWebhook(supabaseAdmin, webhookEventId, "processado", null, {
    id_salao: cobrancaAtual.id_salao || assinatura.id_salao,
    id_assinatura: assinatura.id,
    id_cobranca: cobrancaAtual.id,
    event_order: eventOrder,
    decisao: "paid_applied",
  });

  return { updated: "paid" };
}

export async function aplicarStatusNaoPago(params: {
  supabaseAdmin: SupabaseClient;
  webhookEventId: string | null;
  cobrancaAtual: CobrancaWebhookRow;
  assinatura: AssinaturaWebhookRow;
  event: string;
  eventOrder: number;
  agoraIso: string;
  isEventoTerminal: boolean;
}) {
  const {
    supabaseAdmin,
    webhookEventId,
    cobrancaAtual,
    assinatura,
    event,
    eventOrder,
    agoraIso,
    isEventoTerminal,
  } = params;

  let novoStatus = assinatura.status || "pendente";

  if (event === "PAYMENT_OVERDUE") novoStatus = "vencida";

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

  if (event === "PAYMENT_RESTORED") novoStatus = "pendente";

  const { error: updateAssinaturaError } = await supabaseAdmin
    .from("assinaturas")
    .update({
      status: novoStatus,
      trial_ativo: false,
      id_cobranca_atual: cobrancaAtual.id,
    })
    .eq("id", assinatura.id);

  if (updateAssinaturaError) {
    await atualizarStatusEventoWebhook(
      supabaseAdmin,
      webhookEventId,
      "erro",
      "Erro ao atualizar assinatura."
    );
    throw updateAssinaturaError;
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
    await atualizarStatusEventoWebhook(
      supabaseAdmin,
      webhookEventId,
      "erro",
      "Erro ao atualizar salao."
    );
    throw updateSalaoError;
  }

  await atualizarStatusEventoWebhook(supabaseAdmin, webhookEventId, "processado", null, {
    id_salao: cobrancaAtual.id_salao || assinatura.id_salao,
    id_assinatura: assinatura.id,
    id_cobranca: cobrancaAtual.id,
    event_order: eventOrder,
    decisao: `status_applied_${novoStatus}`,
  });

  return { updated: novoStatus };
}
