import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class EstoqueMutacaoServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "EstoqueMutacaoServiceError";
  }
}

export function createEstoqueMutacaoService() {
  return {
    async validarPermissao(idSalao: string) {
      return requireSalaoPermission(idSalao, "estoque_ver", {
        allowedNiveis: ["admin", "gerente"],
      });
    },

    async validarPlano(idSalao: string) {
      return assertCanMutatePlanFeature(idSalao, "estoque");
    },

    async reportarFalhaMovimentacao(params: {
      idSalao: string;
      error: unknown;
    }) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `estoque:movimentacao_manual:${params.idSalao}`,
          module: "estoque",
          title: "Movimentacao manual de estoque falhou",
          description:
            params.error instanceof Error
              ? params.error.message
              : "Erro interno ao processar estoque.",
          severity: "alta",
          idSalao: params.idSalao,
          details: {
            route: "/api/estoque/processar",
            acao: "movimentacao_manual",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de estoque:",
          incidentError
        );
      }
    },
  };
}

export type EstoqueMutacaoService = ReturnType<typeof createEstoqueMutacaoService>;
export { AuthzError, PlanAccessError };
