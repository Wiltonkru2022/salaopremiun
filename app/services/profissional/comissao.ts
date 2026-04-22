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
) {
  const inicioMes = inicioMesISO();
  const fimMes = fimMesISO();

  return runAdminOperation({
    action: "profissional_comissao_resumo",
    actorId: idProfissional,
    idSalao,
    run: async (supabaseAdmin) => {
      const { data, error } = await supabaseAdmin
        .from("comissoes_lancamentos")
        .select(
          "id, competencia_data, descricao, percentual_aplicado, valor_base, valor_comissao, valor_comissao_assistente, tipo_destinatario, status, pago_em"
        )
        .eq("id_salao", idSalao)
        .eq("id_profissional", idProfissional)
        .gte("competencia_data", inicioMes)
        .lte("competencia_data", fimMes)
        .order("competencia_data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(
          error.message || "Erro ao carregar comissoes do profissional."
        );
      }

      const itens = ((data ?? []) as ComissaoLancamentoRow[]).map((item) => {
        const valor = getValorLancamento(item);
        const status = String(item.status || "pendente").toLowerCase();

        return {
          id: item.id,
          competenciaData: item.competencia_data,
          descricao: item.descricao || "Lancamento de comissao",
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
