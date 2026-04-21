import {
  AuthzError,
  requireSalaoMembership,
} from "@/lib/auth/require-salao-membership";
import {
  processarEstoqueComanda,
  reverterEstoqueComanda,
  validarComandaParaEstoque,
} from "@/lib/estoque/comanda-stock";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";

type EstoqueComandaParams = {
  idSalao: string;
  idComanda: string;
};

export class EstoqueComandaServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "EstoqueComandaServiceError";
  }
}

export function createEstoqueComandaService() {
  return {
    async validarAcesso(idSalao: string) {
      return requireSalaoMembership(idSalao, {
        allowedNiveis: ["admin", "gerente"],
      });
    },

    async validarComanda(params: EstoqueComandaParams) {
      return validarComandaParaEstoque({
        supabaseAdmin: getSupabaseAdmin(),
        ...params,
      });
    },

    async processarComanda(params: EstoqueComandaParams & { idUsuario: string }) {
      return processarEstoqueComanda(getSupabaseAdmin(), {
        ...params,
        sourceModule: "estoque",
        sourceAction: "processar_comanda",
      });
    },

    async reverterComanda(params: EstoqueComandaParams & { idUsuario: string }) {
      return reverterEstoqueComanda(getSupabaseAdmin(), {
        ...params,
        sourceModule: "estoque",
        sourceAction: "reverter_comanda",
      });
    },

    async registrarLogProcessamento(params: {
      idSalao: string;
      idUsuario: string;
      idComanda: string;
      result: Record<string, unknown>;
    }) {
      await registrarLogSistema({
        gravidade: params.result.skipped ? "warning" : "info",
        modulo: "estoque",
        idSalao: params.idSalao,
        idUsuario: params.idUsuario,
        mensagem: params.result.skipped
          ? "Processamento de estoque da comanda ignorado."
          : "Estoque da comanda processado pelo servidor.",
        detalhes: {
          acao: "processar_comanda",
          id_comanda: params.idComanda,
          processed: Boolean(params.result.processed),
          skipped: Boolean(params.result.skipped),
          reason: params.result.reason || null,
          movements: params.result.movements || 0,
          items_updated: params.result.itemsUpdated || 0,
        },
      });
    },

    async registrarLogReversao(params: {
      idSalao: string;
      idUsuario: string;
      idComanda: string;
      result: Record<string, unknown>;
    }) {
      await registrarLogSistema({
        gravidade: params.result.skipped ? "warning" : "info",
        modulo: "estoque",
        idSalao: params.idSalao,
        idUsuario: params.idUsuario,
        mensagem: params.result.skipped
          ? "Reversao de estoque da comanda ignorada."
          : "Estoque da comanda revertido pelo servidor.",
        detalhes: {
          acao: "reverter_comanda",
          id_comanda: params.idComanda,
          reverted: Boolean(params.result.reverted),
          skipped: Boolean(params.result.skipped),
          reason: params.result.reason || null,
          movements: params.result.movements || 0,
        },
      });
    },

    async reportarFalhaProcessamento(params: {
      idSalao: string;
      idComanda: string;
      error: unknown;
    }) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `estoque:processar_comanda:${params.idSalao}:${params.idComanda}`,
          module: "estoque",
          title: "Baixa de estoque da comanda falhou",
          description:
            params.error instanceof Error
              ? params.error.message
              : "Erro interno ao processar o estoque da comanda.",
          severity: "critica",
          idSalao: params.idSalao,
          details: {
            route: "/api/estoque/processar-comanda",
            acao: "processar_comanda",
            id_comanda: params.idComanda,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente de processamento de estoque:",
          incidentError
        );
      }
    },

    async reportarFalhaReversao(params: {
      idSalao: string;
      idComanda: string;
      error: unknown;
    }) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `estoque:reverter_comanda:${params.idSalao}:${params.idComanda}`,
          module: "estoque",
          title: "Reversao de estoque da comanda falhou",
          description:
            params.error instanceof Error
              ? params.error.message
              : "Erro interno ao reverter o estoque da comanda.",
          severity: "alta",
          idSalao: params.idSalao,
          details: {
            route: "/api/estoque/reverter-comanda",
            acao: "reverter_comanda",
            id_comanda: params.idComanda,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente de reversao de estoque:",
          incidentError
        );
      }
    },
  };
}

export type EstoqueComandaService = ReturnType<typeof createEstoqueComandaService>;
export { AuthzError };
