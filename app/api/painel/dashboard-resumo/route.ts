import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Sessao expirada.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, id_salao, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario?.id_salao) {
    return jsonError(
      usuarioError?.message || "Nao foi possivel identificar o salao do usuario.",
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
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", usuario.id_salao)
      .eq("data", nowDate)
      .in("status", ["confirmado", "pendente", "atendido", "aguardando_pagamento"]),
    supabase
      .from("agendamentos")
      .select("data, hora_inicio")
      .eq("id_salao", usuario.id_salao)
      .eq("status", "confirmado")
      .in("data", [nowDate, inTwoHoursIso.slice(0, 10)]),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", usuario.id_salao),
    supabase
      .from("comandas")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", usuario.id_salao)
      .eq("status", "fechada")
      .gte("fechada_em", startOfMonth)
      .lt("fechada_em", endOfMonth),
    supabase
      .from("comandas")
      .select("total, id_cliente")
      .eq("id_salao", usuario.id_salao)
      .eq("status", "fechada")
      .gte("fechada_em", startOfMonth)
      .lt("fechada_em", endOfMonth),
    supabase
      .from("comissoes_lancamentos")
      .select("valor_comissao")
      .eq("id_salao", usuario.id_salao)
      .eq("status", "pendente")
      .gte("competencia_data", startOfMonth.slice(0, 10))
      .lt("competencia_data", endOfMonth.slice(0, 10)),
    supabase
      .from("comandas")
      .select("total")
      .eq("id_salao", usuario.id_salao)
      .eq("status", "fechada")
      .gte("fechada_em", startOfDay)
      .lt("fechada_em", endOfDay),
    supabase
      .from("profissionais")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", usuario.id_salao)
      .eq("status", "ativo"),
    supabase
      .from("comandas")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", usuario.id_salao)
      .eq("status", "aguardando_pagamento"),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", usuario.id_salao)
      .eq("status", "cancelado")
      .gte("data", startOfMonth.slice(0, 10))
      .lt("data", endOfMonth.slice(0, 10)),
    supabase
      .from("saloes")
      .select("plano")
      .eq("id", usuario.id_salao)
      .maybeSingle(),
  ]);

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
