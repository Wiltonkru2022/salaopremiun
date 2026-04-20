import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getWebhookEventOrder,
  mapAsaasStatusToInternal,
  toMiddayIso,
} from "@/lib/webhooks/asaas/status";

export async function criarCobrancaWebhookDeAssinaturaRecorrente(params: {
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

  if (existente?.id) return existente;

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
