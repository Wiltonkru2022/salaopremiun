import { runAdminOperation } from "@/lib/supabase/admin-ops";

type ComissaoResumoRow = {
  valor_comissao?: number | string | null;
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

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function buscarResumoInicioProfissional(
  idSalao: string,
  idProfissional: string
) {
  const hoje = hojeISO();
  const inicioMes = inicioMesISO();
  const fimMes = fimMesISO();

  return runAdminOperation({
    action: "profissional_resumo_inicio",
    actorId: idProfissional,
    idSalao,
    run: async (supabaseAdmin) => {
      const [
        { count: atendimentosHoje, error: erroHoje },
        { count: atendimentosMes, error: erroMes },
        { data: comissoes, error: erroComissao },
      ] = await Promise.all([
        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("profissional_id", idProfissional)
          .eq("data", hoje),

        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("profissional_id", idProfissional)
          .gte("data", inicioMes)
          .lte("data", fimMes),

        supabaseAdmin
          .from("comissoes_lancamentos")
          .select("valor_comissao")
          .eq("id_salao", idSalao)
          .eq("id_profissional", idProfissional)
          .gte("competencia_data", inicioMes)
          .lte("competencia_data", fimMes),
      ]);

      if (erroHoje) throw new Error(erroHoje.message);
      if (erroMes) throw new Error(erroMes.message);
      if (erroComissao) throw new Error(erroComissao.message);

      const totalComissaoMes = ((comissoes ?? []) as ComissaoResumoRow[]).reduce(
        (acc, item) => acc + Number(item.valor_comissao || 0),
        0
      );

      return {
        atendimentosHoje: atendimentosHoje ?? 0,
        atendimentosMes: atendimentosMes ?? 0,
        totalComissaoMes,
      };
    },
  });
}
