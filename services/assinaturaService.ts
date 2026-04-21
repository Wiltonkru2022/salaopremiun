import { addDays, format, isBefore } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getRenovacaoAutomaticaInfo } from "@/lib/assinaturas/renovacao-automatica";
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

async function getSupabaseServer() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurada.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
  return {
    async validarSalaoAdmin(idSalao: string, adminOnlyMessage: string) {
      const supabase = await getSupabaseServer();
      const supabaseAdmin = getSupabaseAdmin();

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

      const { data: usuario, error: usuarioError } = await supabaseAdmin
        .from("usuarios")
        .select("id_salao, status, nivel")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (usuarioError) {
        throw new AssinaturaServiceError(
          "Erro ao validar vinculo do usuario com o salao.",
          500
        );
      }

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
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("assinaturas")
        .select(
          "id, plano, valor, vencimento_em, renovacao_automatica, forma_pagamento_atual, asaas_customer_id, asaas_credit_card_token, asaas_subscription_id, asaas_subscription_status, status, trial_ativo, trial_inicio_em, trial_fim_em"
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

    async atualizarRenovacaoAssinatura(assinaturaId: string, renovacaoAutomatica: boolean) {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({ renovacao_automatica: renovacaoAutomatica })
        .eq("id", assinaturaId);

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

      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_subscription_id: subscriptionId,
          asaas_subscription_status:
            String(recurring.status || "").trim() || "ACTIVE",
        })
        .eq("id", params.assinaturaId);

      if (error) {
        throw new AssinaturaServiceError(
          error.message || "Erro ao salvar assinatura recorrente do cartao.",
          500
        );
      }
    },

    async limparRecorrenciaCartao(assinaturaId: string, asaasSubscriptionId: string) {
      try {
        await removeAsaasSubscription(asaasSubscriptionId);
      } catch (error) {
        if (!isAsaasSubscriptionNotFoundError(error)) {
          throw error;
        }
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_subscription_id: null,
          asaas_subscription_status: null,
        })
        .eq("id", assinaturaId);

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
      const supabaseAdmin = getSupabaseAdmin();
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
      const supabaseAdmin = getSupabaseAdmin();
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
      const supabaseAdmin = getSupabaseAdmin();
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
            trial_ativo: true,
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
          .eq("id", params.assinaturaExistente.id);

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
          trial_ativo: true,
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
      const supabaseAdmin = getSupabaseAdmin();
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
