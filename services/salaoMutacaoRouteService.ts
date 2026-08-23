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
import type { PermissionKey, UserNivel } from "@/lib/permissions";

export type SalaoMutacaoConfig = {
  permission: PermissionKey;
  allowedNiveis?: UserNivel[];
  planFeature: PlanoRecursoCodigo;
  incidentKeyPrefix: string;
  module: string;
  title: string;
  fallbackMessage: string;
  route: string;
  getAction: (acaoRaw: string) => string | null;
  requiresProductsModule?: boolean;
};

async function validarEstadoOperacional(
  idSalao: string,
  config: SalaoMutacaoConfig
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("saloes")
    .select("onboarding_concluido, produtos_modulo_ativo")
    .eq("id", idSalao)
    .maybeSingle();

  if (error || !data) {
    throw new AuthzError(
      "Nao foi possivel validar o estado do salao. Tente novamente.",
      503,
      "estado_salao_indisponivel"
    );
  }

  if (data.onboarding_concluido !== true) {
    throw new AuthzError(
      "Finalize a configuracao inicial do salao antes de usar esta funcionalidade.",
      423,
      "onboarding_pendente"
    );
  }

  if (config.requiresProductsModule && data.produtos_modulo_ativo === false) {
    throw new AuthzError(
      "A funcionalidade de produtos e estoque esta desativada para este salao.",
      409,
      "produtos_desativados"
    );
  }
}

export function createSalaoMutacaoRouteService(config: SalaoMutacaoConfig) {
  return {
    async validar(idSalao: string, permissionOverride?: PermissionKey) {
      await requireSalaoPermission(
        idSalao,
        permissionOverride || config.permission,
        {
          allowedNiveis: config.allowedNiveis || ["admin", "gerente"],
        }
      );
      await validarEstadoOperacional(idSalao, config);
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
