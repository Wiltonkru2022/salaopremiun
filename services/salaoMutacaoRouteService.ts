import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
  type PlanoRecursoCodigo,
} from "@/lib/plans/access";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PermissionKey } from "@/lib/permissions";

export type SalaoMutacaoConfig = {
  permission: PermissionKey;
  allowedNiveis?: Array<"admin" | "gerente" | "profissional" | "assistente">;
  planFeature: PlanoRecursoCodigo;
  incidentKeyPrefix: string;
  module: string;
  title: string;
  fallbackMessage: string;
  route: string;
  getAction: (acaoRaw: string) => string | null;
};

export function createSalaoMutacaoRouteService(config: SalaoMutacaoConfig) {
  return {
    async validar(idSalao: string) {
      await requireSalaoPermission(idSalao, config.permission, {
        allowedNiveis: config.allowedNiveis || ["admin", "gerente"],
      });
      await assertCanMutatePlanFeature(idSalao, config.planFeature);
    },

    async reportarFalha(params: {
      idSalao: string;
      acaoRaw: string;
      error: unknown;
      details?: Record<string, unknown>;
    }) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `${config.incidentKeyPrefix}:${params.acaoRaw || "desconhecida"}:${params.idSalao}`,
          module: config.module,
          title: config.title,
          description:
            params.error instanceof Error
              ? params.error.message
              : config.fallbackMessage,
          severity: "alta",
          idSalao: params.idSalao,
          details: {
            acao: config.getAction(params.acaoRaw),
            route: config.route,
            ...(params.details || {}),
          },
        });
      } catch (incidentError) {
        console.error(
          `Falha ao registrar incidente operacional de ${config.module}:`,
          incidentError
        );
      }
    },
  };
}

export { AuthzError, PlanAccessError };
