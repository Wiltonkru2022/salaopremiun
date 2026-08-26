import {
  excluirVenda,
  obterDetalhesVenda,
  reabrirVenda,
  validarComandaVenda,
} from "@/lib/vendas/processar";
import { getDatabaseAdmin } from "@/lib/db/admin";

type DatabaseAdminClient = ReturnType<typeof getDatabaseAdmin>;

export function createVendaService(
  databaseAdmin: DatabaseAdminClient = getDatabaseAdmin()
) {
  return {
    validarComanda: (params: { idSalao: string; idComanda: string }) =>
      validarComandaVenda({
        databaseAdmin,
        ...params,
      }),

    obterDetalhes: (params: { idComanda: string }) =>
      obterDetalhesVenda({
        databaseAdmin,
        ...params,
      }),

    reabrir: (params: {
      idSalao: string;
      idComanda: string;
      motivo?: string | null;
      idUsuario: string;
    }) =>
      reabrirVenda({
        databaseAdmin,
        ...params,
      }),

    excluir: (params: {
      idSalao: string;
      idComanda: string;
      motivo?: string | null;
      idUsuario: string;
    }) =>
      excluirVenda({
        databaseAdmin,
        ...params,
      }),
  };
}

export type VendaService = ReturnType<typeof createVendaService>;
