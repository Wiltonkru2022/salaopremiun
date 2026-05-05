import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return jsonError("Sessao expirada.", 401);
  }

  if (!usuario?.id_salao) {
    return jsonError(
      "Nao foi possivel identificar o salao do usuario.",
      403
    );
  }

  if (usuario.status !== "ativo") {
    return jsonError("Usuario inativo.", 403);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const nowDate = nowIso.slice(0, 10);
  const inTwoHoursIso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const getCachedDashboardResumo = unstable_cache(
    async (
      idSalao: string,
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
          .eq("id_salao", idSalao)
          .eq("data", nowDateArg)
          .in("status", ["confirmado", "pendente", "atendido", "aguardando_pagamento"]),
        supabaseAdmin
          .from("agendamentos")
          .select("data, hora_inicio")
          .eq("id_salao", idSalao)
          .eq("status", "confirmado")
          .in("data", [nowDateArg, inTwoHoursDateArg]),
        supabaseAdmin
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao),
        supabaseAdmin
          .from("comandas")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("status", "fechada")
          .gte("fechada_em", startOfMonthArg)
          .lt("fechada_em", endOfMonthArg),
        supabaseAdmin
          .from("comandas")
          .select("total, id_cliente")
          .eq("id_salao", idSalao)
          .eq("status", "fechada")
          .gte("fechada_em", startOfMonthArg)
          .lt("fechada_em", endOfMonthArg),
        supabaseAdmin
          .from("comissoes_lancamentos")
          .select("valor_comissao")
          .eq("id_salao", idSalao)
          .eq("status", "pendente")
          .gte("competencia_data", startOfMonthArg.slice(0, 10))
          .lt("competencia_data", endOfMonthArg.slice(0, 10)),
        supabaseAdmin
          .from("comandas")
          .select("total")
          .eq("id_salao", idSalao)
          .eq("status", "fechada")
          .gte("fechada_em", startOfDayArg)
          .lt("fechada_em", endOfDayArg),
        supabaseAdmin
          .from("profissionais")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("status", "ativo"),
        supabaseAdmin
          .from("comandas")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("status", "aguardando_pagamento"),
        supabaseAdmin
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("status", "cancelado")
          .gte("data", startOfMonthArg.slice(0, 10))
          .lt("data", endOfMonthArg.slice(0, 10)),
        supabaseAdmin
          .from("saloes")
          .select("plano")
          .eq("id", idSalao)
          .maybeSingle(),
      ]);

      return {
        agendamentosHoje,
        agHojeError,
        proximosConfirmadosRows,
        proxError,
        clientesAtivos,
        clientesError,
        comandasMes,
        comandasMesError,
        comandasMesRows,
        comandasMesRowsError,
        comissoesPendentesRows,
        comissoesError,
        caixaDiaRows,
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

  const {
    agendamentosHoje,
    agHojeError,
    proximosConfirmadosRows,
    proxError,
    clientesAtivos,
    clientesError,
    comandasMes,
    comandasMesError,
    comandasMesRows,
    comandasMesRowsError,
    comissoesPendentesRows,
    comissoesError,
    caixaDiaRows,
    caixaDiaError,
    profissionaisAtivos,
    profissionaisError,
    aguardandoPagamento,
    aguardandoError,
    cancelamentosMes,
    cancelamentosError,
    salaoInfo,
    salaoInfoError,
  } = await getCachedDashboardResumo(
    usuario.id_salao,
    nowDate,
    inTwoHoursIso.slice(0, 10),
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay
  );

  const firstError =
    agHojeError ||
    proxError ||
    clientesError ||
    comandasMesError ||
    comandasMesRowsError ||
    comissoesError ||
    caixaDiaError ||
    profissionaisError ||
    aguardandoError ||
    cancelamentosError ||
    salaoInfoError;

  if (firstError) {
    return jsonError(firstError.message || "Erro ao carregar dashboard.", 500);
  }

  const proximosConfirmadosCount = (proximosConfirmadosRows || [])
    .filter((row: { data: string | null; hora_inicio: string | null }) => {
      const inicio = row.data && row.hora_inicio
        ? new Date(`${row.data}T${row.hora_inicio}`)
        : null;
      return inicio && inicio >= now && inicio <= new Date(now.getTime() + 2 * 60 * 60 * 1000);
    })
    .length;

  const faturamentoMes = (comandasMesRows || []).reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  );
  const clientesUnicos = new Set(
    (comandasMesRows || []).map((row) => row.id_cliente).filter(Boolean)
  ).size;
  const comissaoPendenteMes = (comissoesPendentesRows || []).reduce(
    (sum, row) => sum + Number(row.valor_comissao || 0),
    0
  );
  const caixaDia = (caixaDiaRows || []).reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  );
  const totalComandasMes = Number(comandasMes || 0);

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      id_salao: usuario.id_salao,
      nivel: usuario.nivel,
      status: usuario.status,
    },
    resumo: {
      agendamentosHoje: Number(agendamentosHoje || 0),
      proximosConfirmados: proximosConfirmadosCount,
      clientesAtivos: Number(clientesAtivos || 0),
      servicosMes: totalComandasMes,
      faturamentoMes,
      ticketMedioMes: totalComandasMes > 0 ? Number((faturamentoMes / totalComandasMes).toFixed(2)) : 0,
      comissaoPendenteMes,
      caixaDia,
      retornoClientes:
        clientesUnicos > 0
          ? Math.min(Math.round((totalComandasMes / clientesUnicos) * 100), 100)
          : 0,
      profissionaisAtivos: Number(profissionaisAtivos || 0),
      cancelamentosMes: Number(cancelamentosMes || 0),
      aguardandoPagamento: Number(aguardandoPagamento || 0),
      planoSalao: String(salaoInfo?.plano || "-"),
      notificacoesPendentes: Number(aguardandoPagamento || 0) + proximosConfirmadosCount,
    },
  });
}
