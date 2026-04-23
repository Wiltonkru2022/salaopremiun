import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AsaasWebhookServiceError,
  type AsaasWebhookBody,
  type AsaasWebhookService,
} from "@/services/asaasWebhookService";
import type { WebhookRegistroRow } from "@/lib/webhooks/asaas/types";

export class AsaasWebhookUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AsaasWebhookUseCaseError";
  }
}

export async function processarWebhookAsaasUseCase(params: {
  headers: Headers;
  body: AsaasWebhookBody;
  service: AsaasWebhookService;
}) {
  let supabaseAdmin: SupabaseClient | null = null;
  let webhookEventId: string | null = null;
  let webhookPayload: AsaasWebhookBody | null = null;
  let event = "";
  let paymentId = "";
  let paymentStatus: string | null = null;

  try {
    supabaseAdmin = params.service.criarSupabaseAdmin();

    if (!params.service.validarTokenWebhook(params.headers)) {
      throw new AsaasWebhookUseCaseError("Webhook nao autorizado.", 401);
    }

    const body = params.body;
    webhookPayload = body;
    event = String(body?.event || "");
    const payment = params.service.extrairPayment(body);

    if (!payment?.id) {
      return {
        status: 200,
        body: {
          ok: true,
          ignored: true,
          reason: "no_payment_id",
        },
      };
    }

    paymentId = String(payment.id);
    const billingType = String(payment.billingType || "").toUpperCase() || null;
    paymentStatus = String(payment.status || "").toUpperCase();
    const externalReference = String(payment.externalReference || "").trim() || null;
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const webhookFingerprint = params.service.buildFingerprint(event, payment);

    let webhookRegistro: WebhookRegistroRow | null = null;

    try {
      webhookRegistro = await params.service.registrarEvento({
        supabaseAdmin,
        fingerprint: webhookFingerprint,
        body,
        event,
        paymentId,
        paymentStatus: paymentStatus || "",
      });
    } catch (webhookRegistroError) {
      const webhookRegistroErrorMessage =
        webhookRegistroError instanceof Error
          ? webhookRegistroError.message
          : "Erro ao registrar evento do webhook.";
      await params.service.registrarFalhaFallback({
        supabaseAdmin,
        webhookPayload: body,
        event,
        paymentId,
        paymentStatus,
        errorMessage: webhookRegistroErrorMessage,
      });
      throw new AsaasWebhookUseCaseError(
        "Erro ao registrar evento do webhook.",
        500
      );
    }

    webhookEventId = webhookRegistro?.id || null;

    if (!webhookRegistro?.should_process) {
      return {
        status: 200,
        body: {
          ok: true,
          ignored: true,
          reason:
            webhookRegistro?.status_processamento === "processado"
              ? "duplicate_event"
              : "event_in_processing",
          event,
        },
      };
    }

    if (externalReference?.startsWith("whatsapp_package:")) {
      const result = await params.service.processarPacoteWhatsapp({
        supabaseAdmin,
        paymentId,
        payment,
        paymentStatus,
        event,
        agoraIso,
        externalReference,
      });

      await params.service.atualizarStatusEvento(
        supabaseAdmin,
        webhookEventId,
        "processado"
      );

      return {
        status: 200,
        body: result,
      };
    }

    let resolved;

    try {
      resolved = await params.service.resolverContexto({
        supabaseAdmin,
        paymentId,
        payment,
        body,
        billingType,
        paymentStatus,
        event,
        agoraIso,
      });
    } catch (contextError) {
      const contextErrorMessage =
        contextError instanceof Error
          ? contextError.message
          : "Erro ao resolver contexto do webhook.";
      await params.service.atualizarStatusEvento(
        supabaseAdmin,
        webhookEventId,
        "erro",
        contextErrorMessage
      );
      throw new AsaasWebhookUseCaseError(contextErrorMessage, 500);
    }

    const { cobrancaAtual, assinatura, plano, asaasSubscriptionId } = resolved;

    if (!cobrancaAtual) {
      await params.service.atualizarStatusEvento(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "charge_not_found"
      );
      return {
        status: 200,
        body: {
          ok: true,
          ignored: true,
          reason: "charge_not_found",
        },
      };
    }

    if (!assinatura) {
      await params.service.atualizarStatusEvento(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao buscar assinatura."
      );
      throw new AsaasWebhookUseCaseError("Erro ao buscar assinatura.", 500);
    }

    const result = await params.service.processarResolvido({
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

    return {
      status: 200,
      body: result,
    };
  } catch (error) {
    if (supabaseAdmin) {
      if (!webhookEventId && webhookPayload && paymentId) {
        await params.service.registrarFalhaFallback({
          supabaseAdmin,
          webhookPayload,
          event,
          paymentId,
          paymentStatus,
          errorMessage: error instanceof Error ? error.message : "Erro webhook",
        });
      }

      await params.service.atualizarStatusEvento(
        supabaseAdmin,
        webhookEventId,
        "erro",
        error instanceof Error ? error.message : "Erro webhook"
      );
    }

    if (error instanceof AsaasWebhookUseCaseError) {
      throw error;
    }

    if (error instanceof AsaasWebhookServiceError) {
      throw new AsaasWebhookUseCaseError(error.message, error.status);
    }

    throw new AsaasWebhookUseCaseError("Erro webhook", 500);
  }
}
