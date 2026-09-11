import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  adicionarItemComanda,
  editarItemComanda,
  enviarComandaParaPagamento,
  processarCriacaoPorAgendamento,
  removerItemComanda,
  salvarBaseComanda,
} from "@/lib/comandas/processar";
import { registrarLogSistema } from "@/lib/system-logs";
import type { ComandaPayload, ItemPayload } from "@/types/comandas";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type LogComandaParams = {
  gravidade: "info" | "warning" | "error";
  idSalao: string;
  idUsuario: string;
  mensagem: string;
  detalhes?: Record<string, unknown>;
};

export function createComandaService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    criarPorAgendamento: (params: {
      idSalao: string;
      idAgendamento: string;
    }) =>
      processarCriacaoPorAgendamento({
        supabaseAdmin,
        ...params,
      }),

    salvarBase: (params: {
      idSalao: string;
      comanda: ComandaPayload;
    }) =>
      salvarBaseComanda({
        supabaseAdmin,
        ...params,
      }),

    adicionarItem: (params: {
      idSalao: string;
      comanda: ComandaPayload;
      item: ItemPayload;
      idempotencyKey?: string | null;
    }) =>
      adicionarItemComanda({
        supabaseAdmin,
        ...params,
      }),

    editarItem: (params: {
      idSalao: string;
      comanda: ComandaPayload;
      item: ItemPayload;
    }) =>
      editarItemComanda({
        supabaseAdmin,
        ...params,
      }),

    removerItem: (params: {
      idSalao: string;
      comanda: ComandaPayload;
      item: ItemPayload;
    }) =>
      removerItemComanda({
        supabaseAdmin,
        ...params,
      }),

    enviarParaPagamento: (params: {
      idSalao: string;
      comanda: ComandaPayload;
    }) =>
      enviarComandaParaPagamento({
        supabaseAdmin,
        ...params,
      }),

    registrarLog: ({ gravidade, idSalao, idUsuario, mensagem, detalhes }: LogComandaParams) =>
      registrarLogSistema({
        gravidade,
        modulo: "comandas",
        idSalao,
        idUsuario,
        mensagem,
        detalhes,
      }),
  };
}

export type ComandaService = ReturnType<typeof createComandaService>;
