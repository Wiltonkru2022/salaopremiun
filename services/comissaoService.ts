import { processarLancamentosComissao } from "@/lib/comissoes/processar-lancamentos";
import { registrarLogSistema } from "@/lib/system-logs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
export type ProcessarComissoesAcao = "marcar_pago" | "cancelar";

export function createComissaoService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    processarLancamentos(params: {
      idSalao: string;
      ids: string[];
      acao: ProcessarComissoesAcao;
    }) {
      return processarLancamentosComissao({
        supabaseAdmin,
        idSalao: params.idSalao,
        ids: params.ids,
        acao: params.acao,
      });
    },

    registrarLogProcessamento(params: {
      idSalao: string;
      idUsuario: string;
      acao: ProcessarComissoesAcao;
      totalLancamentos: number;
      totalVales: number;
      totalProfissionaisComVales: number;
      idsSolicitados: number;
      idsProcessados: string[];
    }) {
      return registrarLogSistema({
        gravidade: params.acao === "cancelar" ? "warning" : "info",
        modulo: "comissoes",
        idSalao: params.idSalao,
        idUsuario: params.idUsuario,
        mensagem:
          params.acao === "cancelar"
            ? "Lancamentos de comissao cancelados pelo servidor."
            : "Lancamentos de comissao marcados como pagos pelo servidor.",
        detalhes: {
          acao: params.acao,
          total_lancamentos: params.totalLancamentos,
          total_vales: params.totalVales,
          total_profissionais_com_vales: params.totalProfissionaisComVales,
          ids_solicitados: params.idsSolicitados,
          ids_processados: params.idsProcessados.length,
        },
      });
    },
  };
}

export type ComissaoService = ReturnType<typeof createComissaoService>;
