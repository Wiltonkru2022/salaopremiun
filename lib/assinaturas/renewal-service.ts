import { addDays, format, isBefore, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarCobranca } from "@/lib/payments/pix-provider";
import {
  getRenovacaoAutomaticaInfo,
  normalizePaymentMethod,
} from "@/lib/assinaturas/renovacao-automatica";
import {
  getWebhookEventOrder,
  mapAsaasStatusToInternal,
} from "@/lib/webhooks/asaas/status";
import type { PlanoSaasRow } from "@/lib/webhooks/asaas/types";

type AssinaturaCronRow = {
  id: string;
  id_salao: string;
  plano: string | null;
  status: string | null;
  vencimento_em: string | null;
  asaas_customer_id: string | null;
  forma_pagamento_atual: string | null;
  asaas_credit_card_token?: string | null;
  asaas_subscription_id?: string | null;
  renovacao_automatica?: boolean | null;
};

type CobrancaExistenteRow = {
  id: string;
  status: string | null;
  asaas_payment_id: string | null;
  data_expiracao: string | null;
};

export type ResultadoRenovacaoAssinatura = Record<string, unknown>;

async function carregarPlanoAtivo(
  supabaseAdmin: SupabaseClient,
  planoCodigo: string
) {
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
    .eq("codigo", planoCodigo)
    .eq("ativo", true)
    .maybeSingle<PlanoSaasRow>();

  if (error) throw error;
  return data ?? null;
}

async function carregarCobrancaPendente(
  supabaseAdmin: SupabaseClient,
  idAssinatura: string,
  hoje: Date
) {
  const { data, error } = await supabaseAdmin
    .from("assinaturas_cobrancas")
    .select("id, status, asaas_payment_id, data_expiracao")
    .eq("id_assinatura", idAssinatura)
    .in("status", ["pending", "PENDING", "pendente"])
    .gte("data_expiracao", format(hoje, "yyyy-MM-dd"))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CobrancaExistenteRow>();

  if (error) throw error;
  return data ?? null;
}

async function registrarCobrancaAutomatica(params: {
  supabaseAdmin: SupabaseClient;
  assinatura: AssinaturaCronRow;
  plano: PlanoSaasRow;
  formaPagamento: "PIX" | "BOLETO";
  hoje: Date;
}) {
  const { supabaseAdmin, assinatura, plano, formaPagamento, hoje } = params;
  const valorPlano = Number(plano.valor_mensal || 0);

  if (valorPlano <= 0) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: "Valor do plano invalido.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  const novoVencimentoCobranca = format(addDays(hoje, 1), "yyyy-MM-dd");
  const referencia = `${assinatura.id_salao}-${plano.codigo}-${Date.now()}`;

  const cobranca = await criarCobranca({
    customerId: assinatura.asaas_customer_id!,
    billingType: formaPagamento,
    valor: valorPlano,
    descricao: `Renovacao ${plano.nome} - SalaoPremium`,
    vencimento: novoVencimentoCobranca,
    referenciaExterna: assinatura.id_salao,
  });

  const statusAsaas = String(cobranca.status || "PENDING").toUpperCase();
  const eventoWebhookInicial =
    statusAsaas === "OVERDUE" ? "PAYMENT_OVERDUE" : "PAYMENT_RESTORED";
  const statusInicial = mapAsaasStatusToInternal(
    statusAsaas,
    eventoWebhookInicial
  );
  const webhookEventOrder = getWebhookEventOrder(
    eventoWebhookInicial,
    statusAsaas
  );

  const { data: cobrancaInserida, error: historicoError } = await supabaseAdmin
    .from("assinaturas_cobrancas")
    .insert({
      id_salao: assinatura.id_salao,
      id_assinatura: assinatura.id,
      id_plano: plano.id,
      referencia,
      descricao: `Renovacao ${plano.nome} - SalaoPremium`,
      valor: valorPlano,
      status: statusInicial,
      forma_pagamento: formaPagamento,
      gateway: "asaas",
      txid: formaPagamento === "PIX" ? cobranca.id : null,
      data_expiracao: novoVencimentoCobranca,
      external_reference: assinatura.id_salao,
      asaas_customer_id: assinatura.asaas_customer_id,
      asaas_payment_id: cobranca.id,
      bank_slip_url:
        (cobranca as { bankSlipUrl?: string | null }).bankSlipUrl || null,
      invoice_url:
        (cobranca as { invoiceUrl?: string | null }).invoiceUrl || null,
      webhook_payload: cobranca,
      webhook_event_order: webhookEventOrder,
      webhook_processed_at: null,
      asaas_status: statusAsaas,
      tipo_movimento: "renovacao",
      gerada_automaticamente: true,
      metadata: {
        origem: "cron_renovacao",
        plano: plano.codigo,
        formaPagamento,
      },
    })
    .select("id")
    .single();

  if (historicoError || !cobrancaInserida?.id) {
    const historicoErrorCode =
      historicoError &&
      typeof historicoError === "object" &&
      "code" in historicoError
        ? String(historicoError.code || "")
        : "";

    if (historicoErrorCode === "23505") {
      return {
        id_salao: assinatura.id_salao,
        ok: true,
        skipped: true,
        motivo: "Cobranca automatica do ciclo ja registrada.",
      } satisfies ResultadoRenovacaoAssinatura;
    }

    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: historicoError?.message || "Erro ao gravar cobranca.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  const { error: updateAssinaturaError } = await supabaseAdmin
    .from("assinaturas")
    .update({
      asaas_payment_id: cobranca.id,
      valor: valorPlano,
      gateway: "asaas",
      forma_pagamento_atual: formaPagamento,
      id_cobranca_atual: cobrancaInserida.id,
      referencia_atual: referencia,
    })
    .eq("id", assinatura.id);

  if (updateAssinaturaError) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: updateAssinaturaError.message,
    } satisfies ResultadoRenovacaoAssinatura;
  }

  return {
    id_salao: assinatura.id_salao,
    ok: true,
    paymentId: cobranca.id,
    billingType: formaPagamento,
    expiracaoCobranca: novoVencimentoCobranca,
  } satisfies ResultadoRenovacaoAssinatura;
}

async function processarRenovacaoAssinatura(params: {
  supabaseAdmin: SupabaseClient;
  assinatura: AssinaturaCronRow;
  hoje: Date;
}) {
  const { supabaseAdmin, assinatura, hoje } = params;
  const planoCodigo = String(assinatura.plano || "").toLowerCase();

  if (!planoCodigo) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: "Plano invalido.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  let plano: PlanoSaasRow | null = null;

  try {
    plano = await carregarPlanoAtivo(supabaseAdmin, planoCodigo);
  } catch (error) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: error instanceof Error ? error.message : "Erro ao buscar plano.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  if (!plano?.id) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: "Plano nao encontrado em planos_saas.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  if (!assinatura.asaas_customer_id) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: "Sem asaas_customer_id.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  const vencimentoAtual = assinatura.vencimento_em
    ? new Date(`${assinatura.vencimento_em}T23:59:59`)
    : null;

  if (!vencimentoAtual || Number.isNaN(vencimentoAtual.getTime())) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: "Vencimento invalido.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  const jaVenceu = isBefore(vencimentoAtual, subDays(hoje, 1));
  if (jaVenceu) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo: "Assinatura ja vencida.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  const renovacaoInfo = getRenovacaoAutomaticaInfo({
    assinaturaExiste: true,
    asaasCustomerId: assinatura.asaas_customer_id,
    formaPagamentoAtual: assinatura.forma_pagamento_atual,
    renovacaoAutomatica: true,
    asaasCreditCardToken: assinatura.asaas_credit_card_token,
    asaasSubscriptionId: assinatura.asaas_subscription_id,
  });

  if (!renovacaoInfo.estaProntaParaCobranca) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo:
        renovacaoInfo.erroAtivacao ||
        "Renovacao automatica ainda nao esta pronta.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  if (
    normalizePaymentMethod(assinatura.forma_pagamento_atual) ===
      "CREDIT_CARD" &&
    String(assinatura.asaas_subscription_id || "").trim()
  ) {
    return {
      id_salao: assinatura.id_salao,
      ok: true,
      skipped: true,
      motivo:
        "Renovacao no cartao gerenciada pela assinatura recorrente do Asaas.",
      subscriptionId: assinatura.asaas_subscription_id,
    } satisfies ResultadoRenovacaoAssinatura;
  }

  const formaPagamento = renovacaoInfo.formaPagamentoNormalizada as
    | "PIX"
    | "BOLETO";

  let cobrancaPendente: CobrancaExistenteRow | null = null;

  try {
    cobrancaPendente = await carregarCobrancaPendente(
      supabaseAdmin,
      assinatura.id,
      hoje
    );
  } catch (error) {
    return {
      id_salao: assinatura.id_salao,
      ok: false,
      motivo:
        error instanceof Error
          ? error.message
          : "Erro ao buscar cobranca pendente.",
    } satisfies ResultadoRenovacaoAssinatura;
  }

  if (cobrancaPendente) {
    return {
      id_salao: assinatura.id_salao,
      ok: true,
      skipped: true,
      motivo: "Ja existe cobranca pendente ativa.",
      paymentId: cobrancaPendente.asaas_payment_id,
    } satisfies ResultadoRenovacaoAssinatura;
  }

  return registrarCobrancaAutomatica({
    supabaseAdmin,
    assinatura,
    plano,
    formaPagamento,
    hoje,
  });
}

export async function executarCronRenovacaoAssinaturas(
  supabaseAdmin: SupabaseClient,
  hoje = new Date()
) {
  const dataLimite = format(addDays(hoje, 3), "yyyy-MM-dd");

  const { data, error } = await supabaseAdmin
    .from("assinaturas")
    .select(
      `
        id,
        id_salao,
        plano,
        status,
        vencimento_em,
        asaas_customer_id,
        forma_pagamento_atual,
        asaas_credit_card_token,
        asaas_subscription_id,
        renovacao_automatica
      `
    )
    .in("status", ["ativo", "ativa", "pago"])
    .eq("renovacao_automatica", true)
    .lte("vencimento_em", dataLimite);

  if (error) throw error;

  const assinaturas = (data || []) as AssinaturaCronRow[];
  const resultados: ResultadoRenovacaoAssinatura[] = [];

  for (const assinatura of assinaturas) {
    resultados.push(
      await processarRenovacaoAssinatura({
        supabaseAdmin,
        assinatura,
        hoje,
      })
    );
  }

  return {
    total: resultados.length,
    resultados,
  };
}
