import { runAdminOperation } from "@/lib/supabase/admin-ops";

type ComissaoLancamentoRow = {
  id: string;
  competencia_data: string | null;
  descricao: string | null;
  percentual_aplicado: number | string | null;
  valor_base: number | string | null;
  valor_comissao: number | string | null;
  valor_comissao_assistente: number | string | null;
  tipo_destinatario: string | null;
  status: string | null;
  pago_em: string | null;
};

export type ResumoComissaoProfissional = {
  itens: Array<{
    id: string;
    competenciaData: string | null;
    descricao: string;
    percentualAplicado: number;
    valorBase: number;
    valor: number;
    status: string;
    pagoEm: string | null;
  }>;
  totalMes: number;
  totalPago: number;
  totalPendente: number;
  totalLancamentos: number;
  ticketMedio: number;
  erro?: string;
};

export const RESUMO_COMISSAO_VAZIO: ResumoComissaoProfissional = {
  itens: [],
  totalMes: 0,
  totalPago: 0,
  totalPendente: 0,
  totalLancamentos: 0,
  ticketMedio: 0,
};

function inicioMesISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function fimMesISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

function getValorLancamento(item: ComissaoLancamentoRow) {
  const destinatario = String(item.tipo_destinatario || "").toLowerCase();

  if (destinatario === "assistente") {
    return Number(item.valor_comissao_assistente ?? item.valor_comissao ?? 0);
  }

  return Number(item.valor_comissao || 0);
}

export async function buscarResumoComissaoProfissional(
  idSalao: string,
  idProfissional: string
): Promise<ResumoComissaoProfissional> {
  const inicioMes = inicioMesISO();
  const fimMes = fimMesISO();

  return runAdminOperation({
    action: "profissional_comissao_resumo",
    actorId: idProfissional,
    idSalao,
    run: async (supabaseAdmin) => {
      const select =
        "id, competencia_data, descricao, percentual_aplicado, valor_base, valor_comissao, valor_comissao_assistente, tipo_destinatario, status, pago_em";

      let result = await supabaseAdmin
        .from("comissoes_lancamentos")
        .select(select)
        .eq("id_salao", idSalao)
        .eq("id_profissional", idProfissional)
        .gte("competencia_data", inicioMes)
        .lte("competencia_data", fimMes)
        .order("competencia_data", { ascending: false })
        .order("criado_em", { ascending: false })
        .limit(50);

      if (result.error) {
        const message = String(result.error.message || "");

        if (
          message.includes("criado_em") ||
          message.includes("competencia_data") ||
          message.includes("does not exist")
        ) {
          result = await supabaseAdmin
            .from("comissoes_lancamentos")
            .select(select)
            .eq("id_salao", idSalao)
            .eq("id_profissional", idProfissional)
            .limit(50);
        }
      }

      const { data, error } = result;

      if (error) {
        throw new Error(
          error.message || "Erro ao carregar comissões do profissional."
        );
      }

      const itens = ((data ?? []) as ComissaoLancamentoRow[]).map((item) => {
        const valor = getValorLancamento(item);
        const status = String(item.status || "pendente").toLowerCase();

        return {
          id: item.id,
          competenciaData: item.competencia_data,
          descricao: item.descricao || "Lançamento de comissão",
          percentualAplicado: Number(item.percentual_aplicado || 0),
          valorBase: Number(item.valor_base || 0),
          valor,
          status,
          pagoEm: item.pago_em,
        };
      });

      const totalMes = itens.reduce((acc, item) => acc + item.valor, 0);
      const totalPago = itens
        .filter((item) => item.status === "pago")
        .reduce((acc, item) => acc + item.valor, 0);
      const totalPendente = itens
        .filter((item) => item.status === "pendente")
        .reduce((acc, item) => acc + item.valor, 0);

      return {
        itens,
        totalMes,
        totalPago,
        totalPendente,
        totalLancamentos: itens.length,
        ticketMedio: itens.length ? totalMes / itens.length : 0,
      };
    },
  });
}
