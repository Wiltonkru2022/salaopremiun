import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type TimedRow = {
  data: string | null;
  hora_inicio: string | null;
};

type ComandaTotalRow = {
  total: number | string | null;
  id_cliente?: string | null;
};

type ComissaoRow = {
  valor_comissao: number | string | null;
};

function sumNumeric<T>(rows: T[] | null | undefined, getter: (row: T) => unknown) {
  return (rows || []).reduce((sum, row) => sum + Number(getter(row) || 0), 0);
}

export async function carregarPainelDashboardResumo(idSalao: string, now = new Date()) {
  const nowIso = now.toISOString();
  const nowDate = nowIso.slice(0, 10);
  const inTwoHoursIso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const getCachedDashboardResumo = unstable_cache(
    async (
      cachedSalaoId: string,
      nowDateArg: string,
      inTwoHoursDateArg: string,
      startOfMonthArg: string,
      endOfMonthArg: string,
      startOfDayArg: string,
      endOfDayArg: string
    ) => {
      const supabaseAdmin = getSupabaseAdmin();

      const [
        { count: agendamentosHoje, error: agHojeError },
        { data: proximosConfirmadosRows, error: proxError },
        { count: clientesAtivos, error: clientesError },
        { count: comandasMes, error: comandasMesError },
        { data: comandasMesRows, error: comandasMesRowsError },
        { data: comissoesPendentesRows, error: comissoesError },
        { data: caixaDiaRows, error: caixaDiaError },
        { count: profissionaisAtivos, error: profissionaisError },
        { count: aguardandoPagamento, error: aguardandoError },
        { count: cancelamentosMes, error: cancelamentosError },
        { data: salaoInfo, error: salaoInfoError },
      ] = await Promise.all([
        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", cachedSalaoId)
          .eq("data", nowDateArg)
          .in("status", ["confirmado", "pendente", "atendido", "aguardando_pagamento"]),
        supabaseAdmin
          .from("agendamentos")
          .select("data, hora_inicio")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "confirmado")
          .in("data", [nowDateArg, inTwoHoursDateArg]),
        supabaseAdmin
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", cachedSalaoId),
        supabaseAdmin
          .from("comandas")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", cachedSalaoId)
          .eq("status", "fechada")
          .gte("fechada_em", startOfMonthArg)
          .lt("fechada_em", endOfMonthArg),
        supabaseAdmin
          .from("comandas")
          .select("total, id_cliente")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "fechada")
          .gte("fechada_em", startOfMonthArg)
          .lt("fechada_em", endOfMonthArg),
        supabaseAdmin
          .from("comissoes_lancamentos")
          .select("valor_comissao")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "pendente")
          .gte("competencia_data", startOfMonthArg.slice(0, 10))
          .lt("competencia_data", endOfMonthArg.slice(0, 10)),
        supabaseAdmin
          .from("comandas")
          .select("total")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "fechada")
          .gte("fechada_em", startOfDayArg)
          .lt("fechada_em", endOfDayArg),
        supabaseAdmin
          .from("profissionais")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", cachedSalaoId)
          .eq("status", "ativo"),
        supabaseAdmin
          .from("comandas")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", cachedSalaoId)
          .eq("status", "aguardando_pagamento"),
        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", cachedSalaoId)
          .eq("status", "cancelado")
          .gte("data", startOfMonthArg.slice(0, 10))
          .lt("data", endOfMonthArg.slice(0, 10)),
        supabaseAdmin
          .from("saloes")
          .select("plano")
          .eq("id", cachedSalaoId)
          .maybeSingle(),
      ]);

      return {
        agendamentosHoje,
        agHojeError,
        proximosConfirmadosRows: (proximosConfirmadosRows || []) as TimedRow[],
        proxError,
        clientesAtivos,
        clientesError,
        comandasMes,
        comandasMesError,
        comandasMesRows: (comandasMesRows || []) as ComandaTotalRow[],
        comandasMesRowsError,
        comissoesPendentesRows: (comissoesPendentesRows || []) as ComissaoRow[],
        comissoesError,
        caixaDiaRows: (caixaDiaRows || []) as ComandaTotalRow[],
        caixaDiaError,
        profissionaisAtivos,
        profissionaisError,
        aguardandoPagamento,
        aguardandoError,
        cancelamentosMes,
        cancelamentosError,
        salaoInfo,
        salaoInfoError,
      };
    },
    ["painel-dashboard-resumo"],
    {
      revalidate: 30,
      tags: ["painel-dashboard-resumo"],
    }
  );

  const data = await getCachedDashboardResumo(
    idSalao,
    nowDate,
    inTwoHoursIso.slice(0, 10),
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay
  );

  const firstError =
    data.agHojeError ||
    data.proxError ||
    data.clientesError ||
    data.comandasMesError ||
    data.comandasMesRowsError ||
    data.comissoesError ||
    data.caixaDiaError ||
    data.profissionaisError ||
    data.aguardandoError ||
    data.cancelamentosError ||
    data.salaoInfoError;

  if (firstError) {
    throw new Error(firstError.message || "Erro ao carregar dashboard.");
  }

  const proximosConfirmadosCount = data.proximosConfirmadosRows.filter((row) => {
    const inicio = row.data && row.hora_inicio ? new Date(`${row.data}T${row.hora_inicio}`) : null;
    return inicio && inicio >= now && inicio <= new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }).length;

  const faturamentoMes = sumNumeric(data.comandasMesRows, (row) => row.total);
  const clientesUnicos = new Set(
    data.comandasMesRows.map((row) => row.id_cliente).filter(Boolean)
  ).size;
  const comissaoPendenteMes = sumNumeric(
    data.comissoesPendentesRows,
    (row) => row.valor_comissao
  );
  const caixaDia = sumNumeric(data.caixaDiaRows, (row) => row.total);
  const totalComandasMes = Number(data.comandasMes || 0);

  return {
    agendamentosHoje: Number(data.agendamentosHoje || 0),
    proximosConfirmados: proximosConfirmadosCount,
    clientesAtivos: Number(data.clientesAtivos || 0),
    servicosMes: totalComandasMes,
    faturamentoMes,
    ticketMedioMes:
      totalComandasMes > 0 ? Number((faturamentoMes / totalComandasMes).toFixed(2)) : 0,
    comissaoPendenteMes,
    caixaDia,
    retornoClientes:
      clientesUnicos > 0
        ? Math.min(Math.round((totalComandasMes / clientesUnicos) * 100), 100)
        : 0,
    profissionaisAtivos: Number(data.profissionaisAtivos || 0),
    cancelamentosMes: Number(data.cancelamentosMes || 0),
    aguardandoPagamento: Number(data.aguardandoPagamento || 0),
    planoSalao: String(data.salaoInfo?.plano || "-"),
    notificacoesPendentes: Number(data.aguardandoPagamento || 0) + proximosConfirmadosCount,
  };
}
