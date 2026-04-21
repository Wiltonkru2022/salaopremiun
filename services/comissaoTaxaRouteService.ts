import {
  AuthzError,
  validarPermissaoRecalculoComissao,
} from "@/lib/comissoes/recalcular-taxa-profissional";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export function createComissaoTaxaRouteService() {
  return {
    validarPermissao(idSalao: string) {
      return validarPermissaoRecalculoComissao(idSalao);
    },

    async reportarFalha(params: {
      idSalao: string;
      idComanda: string;
      error: unknown;
    }) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `comissoes:recalcular-taxa:${params.idSalao}:${params.idComanda || "sem-comanda"}`,
          module: "comissoes",
          title: "Recalculo de taxa profissional falhou",
          description:
            params.error instanceof Error
              ? params.error.message
              : "Erro interno ao recalcular taxa do profissional.",
          severity: "alta",
          idSalao: params.idSalao,
          details: {
            id_comanda: params.idComanda || null,
            route: "/api/comissoes/recalcular-taxa-profissional",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de recalculo de comissao:",
          incidentError
        );
      }
    },
  };
}

export { AuthzError };
