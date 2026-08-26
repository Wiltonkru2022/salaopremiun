import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  assertProdutosModuloAtivo,
  SalaoOperationalStateError,
} from "@/lib/saloes/operational-state";
import { getDatabaseAdmin } from "@/lib/db/admin";

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
      try {
        await assertProdutosModuloAtivo(idSalao);
      } catch (error) {
        if (error instanceof SalaoOperationalStateError) {
          throw new EstoqueMutacaoServiceError(error.message, error.status);
        }
        throw error;
      }

      return assertCanMutatePlanFeature(idSalao, "estoque");
    },

    async reportarFalhaMovimentacao(params: {
      idSalao: string;
      error: unknown;
    }) {
      try {
        await reportOperationalIncident({
          databaseAdmin: getDatabaseAdmin(),
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