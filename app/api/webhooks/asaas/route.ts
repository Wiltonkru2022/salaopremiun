import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyHeaderSecret } from "@/lib/auth/verify-secret";
import {
  resolverContextoWebhookAsaas,
  type AssinaturaWebhookContextRow,
  type CobrancaWebhookResolvedRow,
} from "@/lib/webhooks/asaas/context";
import { registrarFalhaWebhookFallback } from "@/lib/webhooks/asaas/fallback-alert";
import {
  atualizarStatusEventoWebhook,
  buildWebhookFingerprint,
  registrarEventoWebhookAsaas,
} from "@/lib/webhooks/asaas/registry";
import {
  processarWebhookAsaasResolvido,
} from "@/lib/webhooks/asaas/processor";
import type {
  PlanoSaasRow,
  WebhookRegistroRow,
} from "@/lib/webhooks/asaas/types";

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

    let cobrancaAtual: CobrancaWebhookResolvedRow | null = null;
    let assinatura: AssinaturaWebhookContextRow | null = null;
    let plano: PlanoSaasRow | null = null;
    let asaasSubscriptionId: string | null = null;

    try {
      const resolved = await resolverContextoWebhookAsaas({
        supabaseAdmin,
        paymentId,
        payment,
        body,
        billingType,
        paymentStatus,
        event,
        agoraIso,
      });

      cobrancaAtual = resolved.cobrancaAtual;
      assinatura = resolved.assinatura;
      plano = resolved.plano;
      asaasSubscriptionId = resolved.asaasSubscriptionId;
    } catch (contextError) {
      console.error("Erro ao resolver contexto do webhook:", contextError);
      const contextErrorMessage =
        contextError instanceof Error
          ? contextError.message
          : "Erro ao resolver contexto do webhook.";
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        contextErrorMessage
      );
      return NextResponse.json(
        { error: contextErrorMessage },
        { status: 500 }
      );
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

    if (!assinatura) {
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
    const result = await processarWebhookAsaasResolvido({
      supabaseAdmin,
      webhookEventId,
      webhookPayload: body,
      event,
      paymentId,
      payment,
      paymentStatus,
      billingType,
      agora,
      agoraIso,
      cobrancaAtual,
      assinatura,
      plano,
      asaasSubscriptionId,
    });

    return NextResponse.json(result);
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
