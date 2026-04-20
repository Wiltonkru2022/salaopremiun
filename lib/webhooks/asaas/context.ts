import type { SupabaseClient } from "@supabase/supabase-js";
import { criarCobrancaWebhookDeAssinaturaRecorrente } from "@/lib/webhooks/asaas/recurring-charge";
import type { PlanoSaasRow } from "@/lib/webhooks/asaas/types";

export type CobrancaWebhookContextRow = {
  id: string;
  id_salao?: string | null;
  id_assinatura: string | null;
  id_plano?: string | null;
  valor?: number | null;
  status?: string | null;
  forma_pagamento?: string | null;
  asaas_payment_id?: string | null;
  data_expiracao?: string | null;
  referencia?: string | null;
  payment_date?: string | null;
  confirmed_date?: string | null;
  plano_origem?: string | null;
  plano_destino?: string | null;
  tipo_movimento?: string | null;
  gerada_automaticamente?: boolean | null;
  webhook_event_order?: number | null;
  webhook_processed_at?: string | null;
  asaas_status?: string | null;
  asaas_subscription_id?: string | null;
};

export type CobrancaWebhookResolvedRow = Omit<
  CobrancaWebhookContextRow,
  "id_assinatura"
> & {
  id_assinatura: string;
};

export type AssinaturaWebhookContextRow = {
  id: string;
  id_salao: string;
  plano?: string | null;
  status?: string | null;
  valor?: number | null;
  vencimento_em?: string | null;
  trial_ativo?: boolean | null;
  trial_inicio_em?: string | null;
  trial_fim_em?: string | null;
  limite_profissionais?: number | null;
  limite_usuarios?: number | null;
  created_at?: string | null;
  asaas_subscription_id?: string | null;
  asaas_credit_card_token?: string | null;
  asaas_credit_card_brand?: string | null;
  asaas_credit_card_last4?: string | null;
  asaas_credit_card_tokenized_at?: string | null;
};

type ResolveWebhookContextParams = {
  supabaseAdmin: SupabaseClient;
  paymentId: string;
  payment: Record<string, unknown>;
  body: Record<string, unknown>;
  billingType: string | null;
  paymentStatus: string | null;
  event: string;
  agoraIso: string;
};

export async function carregarCobrancaWebhook(
  supabaseAdmin: SupabaseClient,
  paymentId: string
) {
  const { data, error } = await supabaseAdmin
    .from("assinaturas_cobrancas")
    .select(
      `
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
      `
    )
    .eq("asaas_payment_id", paymentId)
    .maybeSingle<CobrancaWebhookContextRow>();

  if (error) throw error;
  return data ?? null;
}

export async function carregarAssinaturaWebhook(
  supabaseAdmin: SupabaseClient,
  idAssinatura: string
) {
  const { data, error } = await supabaseAdmin
    .from("assinaturas")
    .select(
      `
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
      `
    )
    .eq("id", idAssinatura)
    .maybeSingle<AssinaturaWebhookContextRow>();

  if (error) throw error;
  return data ?? null;
}

export async function carregarPlanoWebhook(
  supabaseAdmin: SupabaseClient,
  idPlano: string | null | undefined
) {
  if (!idPlano) return null;

  const { data, error } = await supabaseAdmin
    .from("planos_saas")
    .select(
      `
        id,
        codigo,
        nome,
        descricao,
        valor_mensal,
        limite_usuarios,
        limite_profissionais,
        ativo
      `
    )
    .eq("id", idPlano)
    .eq("ativo", true)
    .maybeSingle<PlanoSaasRow>();

  if (error) throw error;
  return data ?? null;
}

export async function resolverContextoWebhookAsaas({
  supabaseAdmin,
  paymentId,
  payment,
  body,
  billingType,
  paymentStatus,
  event,
  agoraIso,
}: ResolveWebhookContextParams) {
  const asaasSubscriptionId =
    String(payment.subscription || "").trim() || null;

  let cobrancaAtual = await carregarCobrancaWebhook(supabaseAdmin, paymentId);

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
    return {
      cobrancaAtual: null,
      assinatura: null,
      plano: null,
      asaasSubscriptionId,
    };
  }

  if (!cobrancaAtual.id_assinatura) {
    throw new Error("Cobranca sem id_assinatura vinculada.");
  }

  const assinatura = await carregarAssinaturaWebhook(
    supabaseAdmin,
    cobrancaAtual.id_assinatura
  );

  if (!assinatura) {
    throw new Error("Assinatura nao encontrada.");
  }

  const plano = await carregarPlanoWebhook(supabaseAdmin, cobrancaAtual.id_plano);

  return {
    cobrancaAtual: cobrancaAtual as CobrancaWebhookResolvedRow,
    assinatura,
    plano,
    asaasSubscriptionId,
  };
}
