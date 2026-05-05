import { ACOES_CAIXA, isAcaoCaixa } from "@/lib/caixa/processar/dispatcher";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveHttpStatus } from "@/lib/caixa/processar/utils";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class CaixaRouteServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "CaixaRouteServiceError";
  }
}

export function createCaixaRouteService() {
  return {
    async reportarFalhaProcessamento(params: {
      idSalao: string;
      acaoRaw: string;
      error: unknown;
    }) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `caixa:processar:${params.acaoRaw || "desconhecida"}:${params.idSalao}`,
          module: "caixa",
          title: "Processamento de caixa falhou",
          description: getErrorMessage(
            params.error,
            "Erro interno ao processar acao do caixa."
          ),
          severity: "alta",
          idSalao: params.idSalao,
          details: {
            acao: isAcaoCaixa(params.acaoRaw) ? params.acaoRaw : null,
            route: "/api/caixa/processar",
            acoes_suportadas: ACOES_CAIXA,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de caixa:",
          incidentError
        );
      }
    },

    resolveStatus(error: unknown) {
      return resolveHttpStatus(error);
    },
  };
}

export type CaixaRouteService = ReturnType<typeof createCaixaRouteService>;
