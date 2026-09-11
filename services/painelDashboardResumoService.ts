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

type AgendamentoDashboardRow = {
  id: string;
  data: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: string | null;
  cliente_id: string | null;
  profissional_id: string | null;
  servico_id: string | null;
};

type ClienteDashboardRow = {
  id: string;
  nome: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  created_at?: string | null;
};

type ComandaClienteRow = {
  id_cliente?: string | null;
  fechada_em?: string | null;
};

type AgendamentoClienteRow = {
  cliente_id?: string | null;
  data?: string | null;
  hora_inicio?: string | null;
};

type ItemComandaDashboardRow = {
  id_profissional?: string | null;
  id_servico?: string | null;
  valor_total?: number | string | null;
  quantidade?: number | string | null;
};

type NomeRow = {
  id: string;
  nome?: string | null;
  nome_exibicao?: string | null;
};

export type DashboardPeriodo = "hoje" | "7d" | "mes" | "ano";

export function normalizeDashboardPeriodo(value?: string | null): DashboardPeriodo {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hoje" || normalized === "7d" || normalized === "ano") {
    return normalized;
  }
  return "mes";
}

function getPeriodoDashboard(periodo: DashboardPeriodo, now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (periodo === "hoje") {
    return {
      start: startOfToday,
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      label: "Hoje",
      chartDays: 1,
    };
  }
  if (periodo === "7d") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      label: "Últimos 7 dias",
      chartDays: 7,
    };
  }
  if (periodo === "ano") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
      label: String(now.getFullYear()),
      chartDays: 365,
    };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    label: "Mês atual",
    chartDays: 31,
  };
}

function sumNumeric<T>(rows: T[] | null | undefined, getter: (row: T) => unknown) {
  return (rows || []).reduce((sum, row) => sum + Number(getter(row) || 0), 0);
}

export async function carregarPainelDashboardResumo(
  idSalao: string,
  now = new Date(),
  periodo: DashboardPeriodo = "mes"
) {
  const nowIso = now.toISOString();
  const nowDate = nowIso.slice(0, 10);
  const inTwoHoursIso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const periodoInfo = getPeriodoDashboard(periodo, now);
  const startOfPeriod = periodoInfo.start.toISOString();
  const endOfPeriod = periodoInfo.end.toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const getCachedDashboardResumo = unstable_cache(
    async (
      cachedSalaoId: string,
      nowDateArg: string,
      inTwoHoursDateArg: string,
      startOfPeriodArg: string,
      endOfPeriodArg: string,
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
        { data: agendaHojeRows, error: agendaHojeRowsError },
        { data: proximosAgendamentosRows, error: proximosAgendamentosError },
        { data: clientesRows, error: clientesRowsError },
        { data: comandasRecentesClientesRows, error: comandasRecentesClientesError },
        { data: agendamentosFuturosClientesRows, error: agendamentosFuturosClientesError },
        { data: itensMesRows, error: itensMesError },
        { data: comandasSerieRows, error: comandasSerieError },
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
          .gte("fechada_em", startOfPeriodArg)
          .lt("fechada_em", endOfPeriodArg),
        supabaseAdmin
          .from("comandas")
          .select("total, id_cliente")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "fechada")
          .gte("fechada_em", startOfPeriodArg)
          .lt("fechada_em", endOfPeriodArg),
        supabaseAdmin
          .from("comissoes_lancamentos")
          .select("valor_comissao")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "pendente")
          .gte("competencia_data", startOfPeriodArg.slice(0, 10))
          .lt("competencia_data", endOfPeriodArg.slice(0, 10)),
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
          .gte("data", startOfPeriodArg.slice(0, 10))
          .lt("data", endOfPeriodArg.slice(0, 10)),
        supabaseAdmin
          .from("saloes")
          .select("plano")
          .eq("id", cachedSalaoId)
          .maybeSingle(),
        supabaseAdmin
          .from("agendamentos")
          .select("id, data, hora_inicio, hora_fim, status, cliente_id, profissional_id, servico_id")
          .eq("id_salao", cachedSalaoId)
          .eq("data", nowDateArg)
          .in("status", ["confirmado", "pendente", "atendido", "aguardando_pagamento"])
          .order("hora_inicio", { ascending: true })
          .limit(12),
        supabaseAdmin
          .from("agendamentos")
          .select("id, data, hora_inicio, hora_fim, status, cliente_id, profissional_id, servico_id")
          .eq("id_salao", cachedSalaoId)
          .gte("data", nowDateArg)
          .in("status", ["confirmado", "pendente"])
          .order("data", { ascending: true })
          .order("hora_inicio", { ascending: true })
          .limit(8),
        supabaseAdmin
          .from("clientes")
          .select("id, nome, telefone, whatsapp, created_at")
          .eq("id_salao", cachedSalaoId)
          .order("created_at", { ascending: true })
          .limit(250),
        supabaseAdmin
          .from("comandas")
          .select("id_cliente, fechada_em")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "fechada")
          .gte("fechada_em", new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString())
          .order("fechada_em", { ascending: false })
          .limit(1000),
        supabaseAdmin
          .from("agendamentos")
          .select("cliente_id, data, hora_inicio")
          .eq("id_salao", cachedSalaoId)
          .gte("data", nowDateArg)
          .in("status", ["confirmado", "pendente"])
          .order("data", { ascending: true })
          .order("hora_inicio", { ascending: true })
          .limit(1000),
        supabaseAdmin
          .from("comanda_itens")
          .select("id_profissional, id_servico, valor_total, quantidade")
          .eq("id_salao", cachedSalaoId)
          .eq("ativo", true)
          .gte("created_at", startOfPeriodArg)
          .lt("created_at", endOfPeriodArg)
          .limit(1500),
        supabaseAdmin
          .from("comandas")
          .select("total, fechada_em")
          .eq("id_salao", cachedSalaoId)
          .eq("status", "fechada")
          .gte("fechada_em", startOfPeriodArg)
          .lt("fechada_em", endOfDayArg)
          .order("fechada_em", { ascending: true })
          .limit(1500),
      ]);

      const agendaRows = [
        ...(((agendaHojeRows || []) as AgendamentoDashboardRow[])),
        ...(((proximosAgendamentosRows || []) as AgendamentoDashboardRow[])),
      ];
      const profissionalIds = Array.from(
        new Set([
          ...agendaRows.map((item) => item.profissional_id).filter(Boolean),
          ...((itensMesRows || []) as ItemComandaDashboardRow[])
            .map((item) => item.id_profissional)
            .filter(Boolean),
        ])
      ).slice(0, 80) as string[];
      const servicoIds = Array.from(
        new Set([
          ...agendaRows.map((item) => item.servico_id).filter(Boolean),
          ...((itensMesRows || []) as ItemComandaDashboardRow[])
            .map((item) => item.id_servico)
            .filter(Boolean),
        ])
      ).slice(0, 120) as string[];
      const clienteIds = Array.from(
        new Set(agendaRows.map((item) => item.cliente_id).filter(Boolean))
      ).slice(0, 80) as string[];
      const [
        { data: profissionaisRows, error: profissionaisRowsError },
        { data: servicosRows, error: servicosRowsError },
        { data: clientesAgendaRows, error: clientesAgendaRowsError },
      ] = await Promise.all([
        profissionalIds.length
          ? supabaseAdmin
              .from("profissionais")
              .select("id, nome, nome_exibicao")
              .eq("id_salao", cachedSalaoId)
              .in("id", profissionalIds)
              .limit(80)
          : Promise.resolve({ data: [], error: null }),
        servicoIds.length
          ? supabaseAdmin
              .from("servicos")
              .select("id, nome")
              .eq("id_salao", cachedSalaoId)
              .in("id", servicoIds)
              .limit(120)
          : Promise.resolve({ data: [], error: null }),
        clienteIds.length
          ? supabaseAdmin
              .from("clientes")
              .select("id, nome")
              .eq("id_salao", cachedSalaoId)
              .in("id", clienteIds)
              .limit(80)
          : Promise.resolve({ data: [], error: null }),
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
        agendaHojeRows: (agendaHojeRows || []) as AgendamentoDashboardRow[],
        agendaHojeRowsError,
        proximosAgendamentosRows: (proximosAgendamentosRows || []) as AgendamentoDashboardRow[],
        proximosAgendamentosError,
        clientesRows: (clientesRows || []) as ClienteDashboardRow[],
        clientesRowsError,
        comandasRecentesClientesRows: (comandasRecentesClientesRows || []) as ComandaClienteRow[],
        comandasRecentesClientesError,
        agendamentosFuturosClientesRows: (agendamentosFuturosClientesRows || []) as AgendamentoClienteRow[],
        agendamentosFuturosClientesError,
        itensMesRows: (itensMesRows || []) as ItemComandaDashboardRow[],
        itensMesError,
        comandasSerieRows: (comandasSerieRows || []) as Array<{ total: number | string | null; fechada_em: string | null }>,
        comandasSerieError,
        profissionaisRows: (profissionaisRows || []) as NomeRow[],
        profissionaisRowsError,
        servicosRows: (servicosRows || []) as NomeRow[],
        servicosRowsError,
        clientesAgendaRows: (clientesAgendaRows || []) as NomeRow[],
        clientesAgendaRowsError,
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
    startOfPeriod,
    endOfPeriod,
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
    data.salaoInfoError ||
    data.agendaHojeRowsError ||
    data.proximosAgendamentosError ||
    data.clientesRowsError ||
    data.comandasRecentesClientesError ||
    data.agendamentosFuturosClientesError ||
    data.itensMesError ||
    data.comandasSerieError ||
    data.profissionaisRowsError ||
    data.servicosRowsError ||
    data.clientesAgendaRowsError;

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
  const profissionaisMap = new Map(
    data.profissionaisRows.map((item) => [
      item.id,
      item.nome_exibicao || item.nome || "Profissional",
    ])
  );
  const servicosMap = new Map(
    data.servicosRows.map((item) => [item.id, item.nome || "Serviço"])
  );
  const clientesAgendaMap = new Map(
    data.clientesAgendaRows.map((item) => [item.id, item.nome || "Cliente"])
  );
  const formatTime = (value: string | null | undefined) => String(value || "").slice(0, 5);
  const agendaHoje = data.agendaHojeRows.slice(0, 8).map((item) => ({
    id: item.id,
    horario: `${formatTime(item.hora_inicio)} - ${formatTime(item.hora_fim)}`,
    cliente: item.cliente_id ? clientesAgendaMap.get(item.cliente_id) || "Cliente" : "Cliente",
    profissional: item.profissional_id
      ? profissionaisMap.get(item.profissional_id) || "Profissional"
      : "Profissional",
    servico: item.servico_id ? servicosMap.get(item.servico_id) || "Serviço" : "Serviço",
    status: item.status || "-",
  }));
  const proximosAgendamentos = data.proximosAgendamentosRows.slice(0, 5).map((item) => ({
    id: item.id,
    data: item.data,
    horario: `${formatTime(item.hora_inicio)} - ${formatTime(item.hora_fim)}`,
    cliente: item.cliente_id ? clientesAgendaMap.get(item.cliente_id) || "Cliente" : "Cliente",
    profissional: item.profissional_id
      ? profissionaisMap.get(item.profissional_id) || "Profissional"
      : "Profissional",
    servico: item.servico_id ? servicosMap.get(item.servico_id) || "Serviço" : "Serviço",
    status: item.status || "-",
  }));
  const receitaPorProfissional = new Map<string, { nome: string; total: number; atendimentos: number }>();
  const servicosAgendados = new Map<string, { nome: string; total: number; receita: number }>();
  for (const item of data.itensMesRows) {
    const valor = Number(item.valor_total || 0);
    const idProfissional = String(item.id_profissional || "");
    if (idProfissional) {
      const atual = receitaPorProfissional.get(idProfissional) || {
        nome: profissionaisMap.get(idProfissional) || "Profissional",
        total: 0,
        atendimentos: 0,
      };
      atual.total += Number.isFinite(valor) ? valor : 0;
      atual.atendimentos += 1;
      receitaPorProfissional.set(idProfissional, atual);
    }
    const idServico = String(item.id_servico || "");
    if (idServico) {
      const atual = servicosAgendados.get(idServico) || {
        nome: servicosMap.get(idServico) || "Serviço",
        total: 0,
        receita: 0,
      };
      atual.total += Number(item.quantidade || 1) || 1;
      atual.receita += Number.isFinite(valor) ? valor : 0;
      servicosAgendados.set(idServico, atual);
    }
  }
  const ultimasComandasPorCliente = new Map<string, string>();
  for (const item of data.comandasRecentesClientesRows) {
    const idCliente = String(item.id_cliente || "");
    const dataFechamento = String(item.fechada_em || "");
    if (idCliente && dataFechamento && !ultimasComandasPorCliente.has(idCliente)) {
      ultimasComandasPorCliente.set(idCliente, dataFechamento);
    }
  }
  const proximosAgendamentosPorCliente = new Set<string>();
  for (const item of data.agendamentosFuturosClientesRows) {
    const idCliente = String(item.cliente_id || "");
    if (!idCliente) continue;

    const inicio = item.data && item.hora_inicio ? new Date(`${item.data}T${item.hora_inicio}`) : null;
    if (!inicio || Number.isNaN(inicio.getTime()) || inicio >= now) {
      proximosAgendamentosPorCliente.add(idCliente);
    }
  }
  const clientesInativos = data.clientesRows
    .filter((cliente) => !proximosAgendamentosPorCliente.has(cliente.id))
    .map((cliente) => {
      const ultimaVisita = ultimasComandasPorCliente.get(cliente.id) || null;
      const referencia = ultimaVisita || cliente.created_at || null;
      const diasSemVir = referencia && !Number.isNaN(new Date(referencia).getTime())
        ? Math.max(0, Math.floor((now.getTime() - new Date(referencia).getTime()) / (24 * 60 * 60 * 1000)))
        : 0;
      return {
        id: cliente.id,
        nome: cliente.nome || "Cliente",
        contato: cliente.whatsapp || cliente.telefone || "",
        ultimaVisita,
        diasSemVir,
      };
    })
    .filter((cliente) => cliente.diasSemVir >= 45)
    .sort((a, b) => b.diasSemVir - a.diasSemVir)
    .slice(0, 6);
  const faturamentoPorDia = new Map<string, number>();
  if (periodo === "ano") {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const date = new Date(now.getFullYear(), monthIndex, 1);
      faturamentoPorDia.set(date.toISOString().slice(0, 7), 0);
    }
  } else {
    const chartDays = periodo === "hoje" ? 1 : periodo === "7d" ? 7 : Math.min(periodoInfo.chartDays, 31);
    for (let index = chartDays - 1; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
      if (periodo === "mes" && date < periodoInfo.start) continue;
      faturamentoPorDia.set(date.toISOString().slice(0, 10), 0);
    }
  }
  for (const item of data.comandasSerieRows) {
    const key = String(item.fechada_em || "").slice(0, periodo === "ano" ? 7 : 10);
    if (faturamentoPorDia.has(key)) {
      faturamentoPorDia.set(key, (faturamentoPorDia.get(key) || 0) + Number(item.total || 0));
    }
  }
  const faturamentoSerie = Array.from(faturamentoPorDia.entries()).map(([dataKey, total]) => ({
    data: dataKey,
    total,
  }));
  const metaMensal = Math.max(faturamentoMes, 1);

  return {
    periodo,
    periodoLabel: periodoInfo.label,
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
    agendaHoje,
    proximosAgendamentos,
    topProfissionais: Array.from(receitaPorProfissional.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    servicosMaisAgendados: Array.from(servicosAgendados.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    clientesInativos,
    clientesSemVir45Dias: clientesInativos.length,
    faturamentoSerie,
    metaMensal,
  };
}
