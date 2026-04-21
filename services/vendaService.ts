import {
  excluirVenda,
  obterDetalhesVenda,
  reabrirVenda,
  validarComandaVenda,
} from "@/lib/vendas/processar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export function createVendaService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
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
