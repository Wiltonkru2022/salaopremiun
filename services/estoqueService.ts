import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type RegistrarMovimentacaoParams = {
  idSalao: string;
  idProduto: string | null;
  idUsuario: string;
  tipo: string | null;
  origem: string | null;
  quantidade: number;
  valorUnitario: number;
  observacoes: string | null;
};

type LogEstoqueParams = {
  gravidade: "info" | "warning" | "error";
  idSalao: string;
  idUsuario: string;
  mensagem: string;
  detalhes?: Record<string, unknown>;
};

export function createEstoqueService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async registrarMovimentacaoManual({
      idSalao,
      idProduto,
      idUsuario,
      tipo,
      origem,
      quantidade,
      valorUnitario,
      observacoes,
    }: RegistrarMovimentacaoParams) {
      if (!idProduto) {
        throw new Error("Produto obrigatorio para movimentacao de estoque.");
      }

      if (!tipo) {
        throw new Error("Tipo obrigatorio para movimentacao de estoque.");
      }

      if (!origem) {
        throw new Error("Origem obrigatoria para movimentacao de estoque.");
      }

      const { data, error } = await supabaseAdmin.rpc(
        "fn_registrar_movimentacao_estoque_manual",
        {
          p_id_salao: idSalao,
          p_id_produto: idProduto,
          p_id_usuario: idUsuario,
          p_tipo: tipo,
          p_origem: origem,
          p_quantidade: quantidade,
          p_valor_unitario: valorUnitario,
          p_observacoes: observacoes || undefined,
        }
      );

      if (error) {
        throw error;
      }

      const resultRow = Array.isArray(data) ? data[0] : data;

      return {
        idMovimentacao: resultRow?.id_movimentacao || null,
        estoqueAtual: resultRow?.estoque_atual ?? null,
      };
    },

    registrarLog: ({ gravidade, idSalao, idUsuario, mensagem, detalhes }: LogEstoqueParams) =>
      registrarLogSistema({
        gravidade,
        modulo: "estoque",
        idSalao,
        idUsuario,
        mensagem,
        detalhes,
      }),
  };
}

export type EstoqueService = ReturnType<typeof createEstoqueService>;
