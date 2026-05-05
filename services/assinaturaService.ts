import { addDays, format, isBefore } from "date-fns";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getPainelUserContextByAuthUserId } from "@/lib/auth/get-painel-user-context";
import { getRenovacaoAutomaticaInfo } from "@/lib/assinaturas/renovacao-automatica";
import { buscarCobranca } from "@/lib/payments/pix-provider";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createAsaasSubscription,
  isAsaasSubscriptionNotFoundError,
  removeAsaasSubscription,
} from "@/lib/payments/asaas-subscriptions";

export class AssinaturaServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "AssinaturaServiceError";
  }
}

type PlanoTrialRow = {
  id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
  ativo: boolean;
};

const PLANO_TRIAL_PADRAO: PlanoTrialRow = {
  id: null,
  codigo: "teste_gratis",
  nome: "Teste gratis",
  descricao: "Periodo de teste gratuito de 7 dias.",
  valor_mensal: 0,
  limite_usuarios: 1,
  limite_profissionais: 3,
  ativo: true,
};

async function getSupabaseServer() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurada.");
  }

  const cookieOptions = getSupabaseCookieOptions(headersList.get("host"));

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

async function getRemoteIp() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = requestHeaders.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

function getRecurringNextDueDate(vencimentoEm?: string | null) {
  const normalized = String(vencimentoEm || "").trim();

  if (normalized) {
    const dueDate = new Date(`${normalized}T12:00:00`);
    if (!Number.isNaN(dueDate.getTime()) && !isBefore(dueDate, new Date())) {
      return normalized;
    }
  }

  return format(addDays(new Date(), 30), "yyyy-MM-dd");
}

export function createAssinaturaService() {
  const supabaseAdmin = getSupabaseAdmin();

  return {
    async validarSalaoAdmin(idSalao: string, adminOnlyMessage: string) {
      const supabase = await getSupabaseServer();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new AssinaturaServiceError("Erro ao validar usuario autenticado.", 401);
      }

      if (!user) {
        throw new AssinaturaServiceError("Usuario nao autenticado.", 401);
      }

      const usuario = await getPainelUserContextByAuthUserId(user.id);

      if (!usuario?.id_salao) {
        throw new AssinaturaServiceError("Usuario sem salao vinculado.", 403);
      }

      if (String(usuario.status || "").toLowerCase() !== "ativo") {
        throw new AssinaturaServiceError("Usuario inativo.", 403);
      }

      if (usuario.id_salao !== idSalao) {
        throw new AssinaturaServiceError("Acesso negado para este salao.", 403);
      }

      if (String(usuario.nivel || "").toLowerCase() !== "admin") {
        throw new AssinaturaServiceError(adminOnlyMessage, 403);
      }
    },

    async buscarAssinaturaSalao(idSalao: string) {
      const { data, error } = await supabaseAdmin
        .from("assinaturas")
        .select(
          "id, plano, valor, vencimento_em, renovacao_automatica, forma_pagamento_atual, asaas_customer_id, asaas_payment_id, asaas_credit_card_token, asaas_subscription_id, asaas_subscription_status, status, trial_ativo, trial_inicio_em, trial_fim_em"
        )
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao consultar assinatura.",
          500
        );
      }

      return data || null;
    },

    async sincronizarTokenCartaoAssinatura(params: {
      assinaturaId: string;
      idSalao: string;
      paymentId: string;
    }) {
      const payment = await buscarCobranca(params.paymentId);
      const creditCard =
        payment.creditCard && typeof payment.creditCard === "object"
          ? payment.creditCard
          : null;

      const token = String(creditCard?.creditCardToken || "").trim() || null;
      const brand = String(creditCard?.creditCardBrand || "").trim() || null;
      const last4 = String(creditCard?.creditCardNumber || "").trim() || null;

      if (!token) {
        return {
          updated: false,
          token: null,
        };
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          forma_pagamento_atual: "CREDIT_CARD",
          asaas_payment_id: params.paymentId,
          asaas_credit_card_token: token,
          asaas_credit_card_brand: brand,
          asaas_credit_card_last4: last4,
          asaas_credit_card_tokenized_at: new Date().toISOString(),
        })
        .eq("id", params.assinaturaId)
        .eq("id_salao", params.idSalao);

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao salvar token do cartao na assinatura.",
          500
        );
      }

      return {
        updated: true,
        token,
      };
    },

    async atualizarRenovacaoAssinatura(params: {
      assinaturaId: string;
      idSalao: string;
      renovacaoAutomatica: boolean;
    }) {
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({ renovacao_automatica: params.renovacaoAutomatica })
        .eq("id", params.assinaturaId)
        .eq("id_salao", params.idSalao);

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao atualizar renovacao automatica.",
          500
        );
      }
    },

    async provisionarRecorrenciaCartao(params: {
      assinaturaId: string;
      idSalao: string;
      customerId: string;
      creditCardToken: string;
      valor: number;
      plano: string;
      vencimentoEm?: string | null;
    }) {
      const remoteIp = await getRemoteIp();
      const recurring = await createAsaasSubscription({
        customerId: params.customerId,
        billingType: "CREDIT_CARD",
        value: params.valor,
        nextDueDate: getRecurringNextDueDate(params.vencimentoEm),
        description: `Assinatura ${String(params.plano || "salaopremium").toUpperCase()} - SalaoPremium`,
        externalReference: params.idSalao,
        creditCardToken: params.creditCardToken,
        remoteIp,
      });

      const subscriptionId = String(recurring.id || "").trim();

      if (!subscriptionId) {
        throw new AssinaturaServiceError(
          "Nao foi possivel provisionar a assinatura recorrente no Asaas.",
          502
        );
      }

      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_subscription_id: subscriptionId,
          asaas_subscription_status:
            String(recurring.status || "").trim() || "ACTIVE",
        })
        .eq("id", params.assinaturaId)
        .eq("id_salao", params.idSalao);

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao salvar assinatura recorrente do cartao.",
          500
        );
      }
    },

    async limparRecorrenciaCartao(params: {
      assinaturaId: string;
      idSalao: string;
      asaasSubscriptionId: string;
    }) {
      try {
        await removeAsaasSubscription(params.asaasSubscriptionId);
      } catch (error) {
        if (!isAsaasSubscriptionNotFoundError(error)) {
          throw error;
        }
      }

      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_subscription_id: null,
          asaas_subscription_status: null,
        })
        .eq("id", params.assinaturaId)
        .eq("id_salao", params.idSalao);

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao limpar assinatura recorrente do cartao.",
          500
        );
      }
    },

    getRenovacaoInfo(args: Parameters<typeof getRenovacaoAutomaticaInfo>[0]) {
      return getRenovacaoAutomaticaInfo(args);
    },

    async buscarPlanoTeste() {
      const { data, error } = await supabaseAdmin
        .from("planos_saas")
        .select(
          "id, codigo, nome, descricao, valor_mensal, limite_usuarios, limite_profissionais, ativo"
        )
        .eq("codigo", "teste_gratis")
        .eq("ativo", true)
        .maybeSingle();

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao consultar plano de teste.",
          500
        );
      }

      return (data as PlanoTrialRow | null) || PLANO_TRIAL_PADRAO;
    },

    async buscarSalaoBasico(idSalao: string) {
      const { data, error } = await supabaseAdmin
        .from("saloes")
        .select("id, plano, trial_ativo, trial_inicio_em, trial_fim_em")
        .eq("id", idSalao)
        .maybeSingle();

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao consultar salao.",
          500
        );
      }

      return data || null;
    },

    async salvarTrial(params: {
      idSalao: string;
      planoTeste: PlanoTrialRow;
      assinaturaExistente?: {
        id?: string | null;
        renovacao_automatica?: boolean | null;
      } | null;
      agoraIso: string;
      trialFimIso: string;
      vencimentoEm: string;
    }) {
      const valorMensal = Number(params.planoTeste.valor_mensal || 0);
      const limiteUsuarios = Number(params.planoTeste.limite_usuarios || 0);
      const limiteProfissionais = Number(
        params.planoTeste.limite_profissionais || 0
      );

      if (params.assinaturaExistente?.id) {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .update({
            plano: params.planoTeste.codigo,
            valor: valorMensal,
            status: "teste_gratis",
            vencimento_em: params.vencimentoEm,
            limite_profissionais: limiteProfissionais,
            limite_usuarios: limiteUsuarios,
            pago_em: null,
            trial_ativo: "true",
            trial_inicio_em: params.agoraIso,
            trial_fim_em: params.trialFimIso,
            gateway: null,
            forma_pagamento_atual: null,
            id_cobranca_atual: null,
            referencia_atual: null,
            asaas_payment_id: null,
            renovacao_automatica:
              params.assinaturaExistente.renovacao_automatica ?? false,
          })
          .eq("id", params.assinaturaExistente.id)
          .eq("id_salao", params.idSalao);

        if (error) {
          throw new AssinaturaServiceError(
            error.message || "Erro ao atualizar assinatura trial.",
            500
          );
        }
      } else {
        const { error } = await supabaseAdmin.from("assinaturas").insert({
          id_salao: params.idSalao,
          asaas_customer_id: null,
          asaas_payment_id: null,
          plano: params.planoTeste.codigo,
          valor: valorMensal,
          status: "teste_gratis",
          vencimento_em: params.vencimentoEm,
          limite_profissionais: limiteProfissionais,
          limite_usuarios: limiteUsuarios,
          pago_em: null,
          trial_ativo: "true",
          trial_inicio_em: params.agoraIso,
          trial_fim_em: params.trialFimIso,
          forma_pagamento_atual: null,
          id_cobranca_atual: null,
          gateway: null,
          referencia_atual: null,
          renovacao_automatica: false,
        });

        if (error) {
          throw new AssinaturaServiceError(
            error.message || "Erro ao criar assinatura trial.",
            500
          );
        }
      }

      const { error: salaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          status: "teste_gratis",
          trial_ativo: true,
          trial_inicio_em: params.agoraIso,
          trial_fim_em: params.trialFimIso,
          limite_profissionais: limiteProfissionais,
          limite_usuarios: limiteUsuarios,
        })
        .eq("id", params.idSalao);

      if (salaoError) {
        throw new AssinaturaServiceError(
          salaoError.message || "Erro ao atualizar dados do salao.",
          500
        );
      }

      return {
        status: "teste_gratis",
        plano: params.planoTeste.codigo,
        nome_plano: params.planoTeste.nome,
        vencimento_em: params.vencimentoEm,
        trial_inicio_em: params.agoraIso,
        trial_fim_em: params.trialFimIso,
        limite_usuarios: limiteUsuarios,
        limite_profissionais: limiteProfissionais,
      };
    },

    async listarHistorico(idSalao: string) {
      const { data, error } = await supabaseAdmin
        .from("assinaturas_cobrancas")
        .select(
          "id, referencia, descricao, valor, status, forma_pagamento, data_expiracao, payment_date, confirmed_date, invoice_url, bank_slip_url, created_at, updated_at, asaas_payment_id, deleted, plano_origem, plano_destino, tipo_movimento, gerada_automaticamente"
        )
        .eq("id_salao", idSalao)
        .order("created_at", { ascending: false });

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao carregar historico.",
          500
        );
      }

      return data || [];
    },
  };
}

export type AssinaturaService = ReturnType<typeof createAssinaturaService>;
