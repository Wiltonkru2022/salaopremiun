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
import { processarWebhookAsaasResolvido } from "@/lib/webhooks/asaas/processor";
import type { PlanoSaasRow } from "@/lib/webhooks/asaas/types";

export class AsaasWebhookServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "AsaasWebhookServiceError";
  }
}

export type AsaasWebhookBody = Record<string, unknown>;

export type AsaasWebhookContextResolved = {
  cobrancaAtual: CobrancaWebhookResolvedRow | null;
  assinatura: AssinaturaWebhookContextRow | null;
  plano: PlanoSaasRow | null;
  asaasSubscriptionId: string | null;
};

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

export function createAsaasWebhookService() {
  return {
    criarSupabaseAdmin() {
      return getSupabaseAdmin();
    },

    validarTokenWebhook(headers: Headers) {
      const tokenHeader =
        headers.get("asaas-access-token") || headers.get("access_token");

      return verifyHeaderSecret(tokenHeader, process.env.ASAAS_WEBHOOK_TOKEN);
    },

    extrairPayment(body: AsaasWebhookBody) {
      return (body.payment as Record<string, unknown> | undefined) ?? null;
    },

    buildFingerprint(event: string, payment: Record<string, unknown>) {
      return buildWebhookFingerprint(event, payment);
    },

    async registrarEvento(params: {
      supabaseAdmin: SupabaseClient;
      fingerprint: string;
      body: AsaasWebhookBody;
      event: string;
      paymentId: string;
      paymentStatus: string;
    }) {
      return registrarEventoWebhookAsaas(params);
    },

    async registrarFalhaFallback(params: {
      supabaseAdmin: SupabaseClient;
      webhookPayload: AsaasWebhookBody;
      event: string;
      paymentId: string;
      paymentStatus: string | null;
      errorMessage: string;
    }) {
      return registrarFalhaWebhookFallback(params);
    },

    async atualizarStatusEvento(
      supabaseAdmin: SupabaseClient,
      webhookEventId: string | null,
      status: "erro" | "processado",
      message?: string
    ) {
      return atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        status,
        message
      );
    },

    async resolverContexto(params: {
      supabaseAdmin: SupabaseClient;
      paymentId: string;
      payment: Record<string, unknown>;
      body: AsaasWebhookBody;
      billingType: string | null;
      paymentStatus: string | null;
      event: string;
      agoraIso: string;
    }) {
      return resolverContextoWebhookAsaas(params);
    },

    async processarResolvido(params: {
      supabaseAdmin: SupabaseClient;
      webhookEventId: string | null;
      webhookPayload: AsaasWebhookBody;
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
    }) {
      return processarWebhookAsaasResolvido(params);
    },
  };
}

export type AsaasWebhookService = ReturnType<typeof createAsaasWebhookService>;
