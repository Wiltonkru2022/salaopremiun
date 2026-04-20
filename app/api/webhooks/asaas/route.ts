import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyHeaderSecret } from "@/lib/auth/verify-secret";
import { registrarFalhaWebhookFallback } from "@/lib/webhooks/asaas/fallback-alert";
import {
  atualizarStatusEventoWebhook,
  buildWebhookFingerprint,
  registrarEventoWebhookAsaas,
} from "@/lib/webhooks/asaas/registry";
import { criarCobrancaWebhookDeAssinaturaRecorrente } from "@/lib/webhooks/asaas/recurring-charge";
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
import type {
  PlanoSaasRow,
  WebhookRegistroRow,
} from "@/lib/webhooks/asaas/types";
import {
  aplicarPagamentoConfirmado,
  aplicarStatusNaoPago,
} from "@/lib/webhooks/asaas/subscription-sync";

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
      const result = await aplicarPagamentoConfirmado({
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
      });

      return NextResponse.json({ ok: true, ...result });
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
      const result = await aplicarStatusNaoPago({
        supabaseAdmin,
        webhookEventId,
        cobrancaAtual,
        assinatura,
        event,
        eventOrder,
        agoraIso,
        isEventoTerminal,
      });

      return NextResponse.json({ ok: true, ...result });
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
