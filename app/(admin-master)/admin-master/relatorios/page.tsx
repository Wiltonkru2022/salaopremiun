import Link from "next/link";
import { ArrowUpRight, BarChart3, CalendarDays, CircleDollarSign, Scissors, TrendingUp, AlertTriangle } from "lucide-react";
import { AdminDataTable } from "@/components/admin-master/AdminMasterViews";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SalonRow = { id: string; nome: string | null; cidade: string | null; estado: string | null; plano: string | null; status: string | null; created_at: string | null };
type SubscriptionRow = { id_salao: string; status: string; trial_ativo: boolean; valor_mensal: number };
type ChargeRow = { id_salao: string; valor: number; status: string; created_at: string; pago_em: string | null; paid_em: string | null; data_expiracao: string | null };
type AppointmentRow = { id_salao: string; status: string; origem: string | null; created_at: string | null; data: string };
type SaleRow = { id_salao: string; status: string; total: number; created_at: string; fechada_em: string | null };
type HealthRow = { id_salao: string; score_total: number; uso_recente: number; inadimplencia_risco: number; tickets_abertos: number; risco_cancelamento: number; atualizado_em: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function dateMs(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isPaidCharge(row: ChargeRow) {
  const status = String(row.status || "").toLowerCase();
  return Boolean(row.pago_em || row.paid_em) || ["pago", "paid", "received", "confirmado"].includes(status);
}

function isOpenCharge(row: ChargeRow) {
  const status = String(row.status || "").toLowerCase();
  return !isPaidCharge(row) && !["cancelado", "cancelled", "deleted"].includes(status);
}

function isActiveSubscription(row: SubscriptionRow) {
  const status = String(row.status || "").toLowerCase();
  return ["ativa", "ativo", "active", "trial", "em_teste"].includes(status) || row.trial_ativo;
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function deltaText(current: number, previous: number) {
  const value = delta(current, previous);
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs. período anterior`;
}

function Metric({ label, value, hint, current, previous, icon: Icon, tone = "white" }: {
  label: string;
  value: string;
  hint: string;
  current?: number;
  previous?: number;
  icon: typeof TrendingUp;
  tone?: "white" | "green" | "amber" | "blue" | "red";
}) {
  const toneClass = {
    white: "border-zinc-200 bg-white text-zinc-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    red: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone];
  const change = current !== undefined && previous !== undefined ? delta(current, previous) : null;
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3"><div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">{label}</div><Icon size={17} className="opacity-50" /></div>
      <div className="mt-3 text-2xl font-black tracking-tight">{value}</div>
      <p className="mt-1 text-sm leading-5 opacity-70">{hint}</p>
      {change !== null ? <div className={`mt-2 text-xs font-bold ${change > 0 ? "text-emerald-700" : change < 0 ? "text-rose-700" : "text-zinc-500"}`}>{deltaText(current!, previous!)}</div> : null}
    </div>
  );
}

function bucketSeries(rows: ChargeRow[], startMs: number, days: number) {
  const buckets = 6;
  const bucketMs = (days * DAY_MS) / buckets;
  const values = Array.from({ length: buckets }, () => 0);
  for (const row of rows) {
    const time = dateMs(row.pago_em || row.paid_em || row.created_at);
    if (!time || time < startMs) continue;
    const index = Math.min(buckets - 1, Math.max(0, Math.floor((time - startMs) / bucketMs)));
    values[index] += Number(row.valor || 0);
  }
  return values;
}

export default async function AdminMasterRelatoriosPage({
  searchParams,
}: {
  searchParams?: Promise<{ periodo?: string }>;
}) {
  await requireAdminMasterUser("relatorios_ver");
  const params = searchParams ? await searchParams : {};
  const days = params.periodo === "30" ? 30 : 90;
  const now = Date.now();
  const currentStartMs = now - days * DAY_MS;
  const previousStartMs = now - days * 2 * DAY_MS;
  const previousStartIso = new Date(previousStartMs).toISOString();
  const supabase = getSupabaseAdmin();

  const [
    { data: saloesData },
    { data: assinaturasData },
    { data: cobrancasData },
    { data: agendamentosData },
    { data: comandasData },
    { data: saudeData },
  ] = await Promise.all([
    (supabase as any).from("saloes").select("id, nome, cidade, estado, plano, status, created_at").order("created_at", { ascending: false }).limit(300),
    (supabase as any).from("assinaturas_saloes").select("id_salao, status, trial_ativo, valor_mensal").limit(300),
    (supabase as any).from("assinaturas_cobrancas").select("id_salao, valor, status, created_at, pago_em, paid_em, data_expiracao").gte("created_at", previousStartIso).limit(1200),
    (supabase as any).from("agendamentos").select("id_salao, status, origem, created_at, data").gte("created_at", previousStartIso).limit(2500),
    (supabase as any).from("comandas").select("id_salao, status, total, created_at, fechada_em").gte("created_at", previousStartIso).limit(2500),
    (supabase as any).from("score_saude_salao").select("id_salao, score_total, uso_recente, inadimplencia_risco, tickets_abertos, risco_cancelamento, atualizado_em").order("score_total", { ascending: true }).limit(200),
  ]);

  const saloes = (saloesData || []) as SalonRow[];
  const assinaturas = (assinaturasData || []) as SubscriptionRow[];
  const cobrancas = (cobrancasData || []) as ChargeRow[];
  const agendamentos = (agendamentosData || []) as AppointmentRow[];
  const comandas = (comandasData || []) as SaleRow[];
  const saude = (saudeData || []) as HealthRow[];
  const saloesMap = new Map(saloes.map((salao) => [salao.id, salao]));

  const current = <T extends { created_at?: string | null }>(rows: T[]) => rows.filter((row) => dateMs(row.created_at) >= currentStartMs);
  const previous = <T extends { created_at?: string | null }>(rows: T[]) => rows.filter((row) => {
    const time = dateMs(row.created_at);
    return time >= previousStartMs && time < currentStartMs;
  });

  const activeSubscriptions = assinaturas.filter(isActiveSubscription);
  const mrr = activeSubscriptions.reduce((sum, item) => sum + Number(item.valor_mensal || 0), 0);
  const activeSalons = saloes.filter((salao) => String(salao.status || "").toLowerCase() !== "excluido").length;
  const newSalonsCurrent = saloes.filter((salao) => dateMs(salao.created_at) >= currentStartMs).length;
  const newSalonsPrevious = saloes.filter((salao) => {
    const time = dateMs(salao.created_at);
    return time >= previousStartMs && time < currentStartMs;
  }).length;

  const chargesCurrent = current(cobrancas);
  const chargesPrevious = previous(cobrancas);
  const paidCurrent = chargesCurrent.filter(isPaidCharge);
  const paidPrevious = chargesPrevious.filter(isPaidCharge);
  const saasRevenueCurrent = paidCurrent.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const saasRevenuePrevious = paidPrevious.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const openCharges = chargesCurrent.filter(isOpenCharge);
  const nowIso = new Date().toISOString();
  const overdue = openCharges.filter((item) => item.data_expiracao && item.data_expiracao < nowIso);

  const appointmentsCurrent = current(agendamentos);
  const appointmentsPrevious = previous(agendamentos);
  const onlineCurrent = appointmentsCurrent.filter((item) => ["app_cliente", "online", "cliente"].includes(String(item.origem || "").toLowerCase())).length;

  const salesCurrent = current(comandas).filter((item) => String(item.status || "").toLowerCase() === "fechada");
  const salesPrevious = previous(comandas).filter((item) => String(item.status || "").toLowerCase() === "fechada");
  const operationalRevenueCurrent = salesCurrent.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const operationalRevenuePrevious = salesPrevious.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const topRevenue = Array.from(salesCurrent.reduce((map, item) => {
    map.set(item.id_salao, (map.get(item.id_salao) || 0) + Number(item.total || 0));
    return map;
  }, new Map<string, number>())).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const riskRows = saude.filter((item) => Number(item.score_total || 0) < 60 || Number(item.risco_cancelamento || 0) >= 50 || Number(item.inadimplencia_risco || 0) >= 50 || Number(item.tickets_abertos || 0) > 0).slice(0, 10);
  const chart = bucketSeries(paidCurrent, currentStartMs, days);
  const maxChart = Math.max(1, ...chart);

  const topRows = topRevenue.map(([idSalao, total]) => {
    const salao = saloesMap.get(idSalao);
    return {
      salao: salao?.nome || idSalao,
      local: [salao?.cidade, salao?.estado].filter(Boolean).join(" / ") || "-",
      plano: salao?.plano || "-",
      receita: formatMoney(total),
      acao: "Abrir salão",
      acao_tipo: "abrir_salao",
      acao_id: idSalao,
    };
  });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-600"><BarChart3 size={15} />Gestão</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Relatórios de crescimento, receita e risco</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Compare o período atual com o anterior e exporte as tabelas sem sair do Admin Master.</p>
          </div>
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            {[30, 90].map((period) => <Link key={period} href={`/admin-master/relatorios?periodo=${period}`} className={`rounded-lg px-3 py-2 text-sm font-bold ${days === period ? "bg-white text-violet-700 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>{period} dias</Link>)}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Salões ativos" value={String(activeSalons)} hint={`${newSalonsCurrent} novo(s) no período.`} current={newSalonsCurrent} previous={newSalonsPrevious} icon={Scissors} tone="blue" />
        <Metric label="MRR estimado" value={formatMoney(mrr)} hint={`${activeSubscriptions.length} assinatura(s) ativa(s).`} icon={TrendingUp} tone="green" />
        <Metric label={`Receita SaaS ${days}d`} value={formatMoney(saasRevenueCurrent)} hint={`${paidCurrent.length} cobrança(s) paga(s).`} current={saasRevenueCurrent} previous={saasRevenuePrevious} icon={CircleDollarSign} tone="green" />
        <Metric label="Inadimplência" value={String(overdue.length)} hint={`${openCharges.length} cobrança(s) aberta(s).`} icon={AlertTriangle} tone={overdue.length ? "amber" : "white"} />
        <Metric label={`Agendamentos ${days}d`} value={String(appointmentsCurrent.length)} hint={`${onlineCurrent} pelo app/online.`} current={appointmentsCurrent.length} previous={appointmentsPrevious.length} icon={CalendarDays} tone="blue" />
        <Metric label="Comandas fechadas" value={String(salesCurrent.length)} hint={`${formatMoney(operationalRevenueCurrent)} movimentados.`} current={salesCurrent.length} previous={salesPrevious.length} icon={CircleDollarSign} />
        <Metric label="Receita operacional" value={formatMoney(operationalRevenueCurrent)} hint="Movimentação dos salões no período." current={operationalRevenueCurrent} previous={operationalRevenuePrevious} icon={TrendingUp} />
        <Metric label="Salões em risco" value={String(riskRows.length)} hint="Score, inadimplência, tickets ou churn." icon={AlertTriangle} tone={riskRows.length ? "red" : "white"} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Tendência</div><h2 className="mt-1 text-lg font-black text-zinc-950">Receita SaaS ao longo do período</h2></div>
          <div className="text-sm font-black text-emerald-700">{formatMoney(saasRevenueCurrent)}</div>
        </div>
        <div className="mt-5 grid h-44 grid-cols-6 items-end gap-2">
          {chart.map((value, index) => (
            <div key={index} className="flex h-full flex-col justify-end gap-2">
              <div className="text-center text-[10px] font-bold text-zinc-400">{value ? formatMoney(value) : "-"}</div>
              <div className="min-h-2 rounded-t-xl bg-violet-500/80" style={{ height: `${Math.max(4, (value / maxChart) * 100)}%` }} />
              <div className="text-center text-[10px] font-semibold text-zinc-400">{index + 1}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-3">
          <div><h2 className="text-lg font-black text-zinc-950">Salões com maior receita operacional</h2><p className="mt-1 text-sm text-zinc-500">A tabela já permite busca, filtro por período e exportação.</p></div>
          <AdminDataTable rows={topRows} columns={["salao", "local", "plano", "receita", "acao"]} />
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">Risco operacional</div>
          <h2 className="mt-1 text-lg font-black">Salões que merecem atenção</h2>
          <div className="mt-4 space-y-2.5">
            {riskRows.length ? riskRows.map((item) => {
              const salao = saloesMap.get(item.id_salao);
              return (
                <Link key={item.id_salao} href={`/admin-master/saloes/${item.id_salao}`} className="block rounded-xl border border-rose-200 bg-white/80 p-3 transition hover:bg-white">
                  <div className="flex items-center justify-between gap-3"><div className="font-black">{salao?.nome || item.id_salao}</div><ArrowUpRight size={15} /></div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-rose-800"><span>Score {item.score_total}</span><span>Tickets {item.tickets_abertos}</span><span>Inadimplência {item.inadimplencia_risco}</span><span>Churn {item.risco_cancelamento}</span></div>
                </Link>
              );
            }) : <div className="rounded-xl border border-rose-200 bg-white/70 p-4 text-sm text-rose-700">Nenhum salão crítico no recorte atual.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
