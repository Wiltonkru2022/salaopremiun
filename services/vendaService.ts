import {
  excluirVenda,
  obterDetalhesVenda,
  reabrirVenda,
  validarComandaVenda,
} from "@/lib/vendas/processar";
import { getDatabaseAdmin } from "@/lib/db/admin";

type DatabaseAdminClient = ReturnType<typeof getDatabaseAdmin>;

export function createVendaService(
  supabaseAdmin: DatabaseAdminClient = getDatabaseAdmin()
) {
  return {
    validarComanda: (params: { idSalao: string; idComanda: string }) =>
      validarComandaVenda({
        supabaseAdmin,
        ...params,
      }),

    obterDetalhes: (params: { idComanda: string }) =>
      obterDetalhesVenda({
        supabaseAdmin,
        ...params,
      }),

    reabrir: (params: {
      idSalao: string;
      idComanda: string;
      motivo?: string | null;
      idUsuario: string;
    }) =>
      reabrirVenda({
        supabaseAdmin,
        ...params,
      }),

    excluir: (params: {
      idSalao: string;
      idComanda: string;
      motivo?: string | null;
      idUsuario: string;
    }) =>
      excluirVenda({
        supabaseAdmin,
        ...params,
      }),
  };
}

export type VendaService = ReturnType<typeof createVendaService>;
