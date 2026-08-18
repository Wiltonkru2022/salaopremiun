import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Scissors,
  TrendingUp,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SalonRow = {
  id: string;
  nome: string | null;
  cidade: string | null;
  estado: string | null;
  plano: string | null;
  status: string | null;
  created_at: string | null;
};

type SubscriptionRow = {
  id_salao: string;
  status: string;
  trial_ativo: boolean;
  valor_mensal: number;
};

type ChargeRow = {
  id_salao: string;
  valor: number;
  status: string;
  created_at: string;
  pago_em: string | null;
  paid_em: string | null;
  data_expiracao: string | null;
};

type AppointmentRow = {
  id_salao: string;
  status: string;
  origem: string | null;
  created_at: string | null;
  data: string;
};

type SaleRow = {
  id_salao: string;
  status: string;
  total: number;
  created_at: string;
  fechada_em: string | null;
};

type HealthRow = {
  id_salao: string;
  score_total: number;
  uso_recente: number;
  inadimplencia_risco: number;
  tickets_abertos: number;
  risco_cancelamento: number;
  atualizado_em: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function since(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function isPaidCharge(row: ChargeRow) {
  const status = String(row.status || "").toLowerCase();
  return Boolean(row.pago_em || row.paid_em) ||
    ["pago", "paid", "received", "confirmado"].includes(status);
}

function isOpenCharge(row: ChargeRow) {
  const status = String(row.status || "").toLowerCase();
  return !isPaidCharge(row) && !["cancelado", "cancelled", "deleted"].includes(status);
}

function isActiveSubscription(row: SubscriptionRow) {
  const status = String(row.status || "").toLowerCase();
  return ["ativa", "ativo", "active", "trial", "em_teste"].includes(status) || row.trial_ativo;
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "white",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
  tone?: "white" | "green" | "amber" | "blue" | "red";
}) {
  const toneClass = {
    white: "border-zinc-200 bg-white text-zinc-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    red: "border-red-200 bg-red-50 text-red-950",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.24em] opacity-60">
          {label}
        </div>
        <Icon size={18} className="opacity-60" />
      </div>
      <div className="mt-3 font-display text-[1.9rem] font-black">{value}</div>
      <p className="mt-1 text-sm leading-5 opacity-70">{hint}</p>
    </div>
  );
}

export default async function AdminMasterRelatoriosPage() {
  await requireAdminMasterUser("relatorios_ver");
  const supabase = getSupabaseAdmin();
  const last30 = since(30);
  const last90 = since(90);

  const [
    { data: saloesData },
    { data: assinaturasData },
    { data: cobrancasData },
    { data: agendamentosData },
    { data: comandasData },
    { data: saudeData },
  ] = await Promise.all([
    (supabase as any)
      .from("saloes")
      .select("id, nome, cidade, estado, plano, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    (supabase as any)
      .from("assinaturas_saloes")
      .select("id_salao, status, trial_ativo, valor_mensal")
      .limit(300),
    (supabase as any)
      .from("assinaturas_cobrancas")
      .select("id_salao, valor, status, created_at, pago_em, paid_em, data_expiracao")
      .gte("created_at", last90)
      .limit(1000),
    (supabase as any)
      .from("agendamentos")
      .select("id_salao, status, origem, created_at, data")
      .gte("created_at", last90)
      .limit(2000),
    (supabase as any)
      .from("comandas")
      .select("id_salao, status, total, created_at, fechada_em")
      .gte("created_at", last90)
      .limit(2000),
    (supabase as any)
      .from("score_saude_salao")
      .select("id_salao, score_total, uso_recente, inadimplencia_risco, tickets_abertos, risco_cancelamento, atualizado_em")
      .order("score_total", { ascending: true })
      .limit(200),
  ]);

  const saloes = (saloesData || []) as SalonRow[];
  const assinaturas = (assinaturasData || []) as SubscriptionRow[];
  const cobrancas = (cobrancasData || []) as ChargeRow[];
  const agendamentos = (agendamentosData || []) as AppointmentRow[];
  const comandas = (comandasData || []) as SaleRow[];
  const saude = (saudeData || []) as HealthRow[];
  const saloesMap = new Map(saloes.map((salao) => [salao.id, salao]));

  const saloesNovos30 = saloes.filter(
    (salao) => salao.created_at && salao.created_at >= last30
  ).length;
  const saloesAtivos = saloes.filter(
    (salao) => String(salao.status || "").toLowerCase() !== "excluido"
  ).length;
  const assinaturasAtivas = assinaturas.filter(isActiveSubscription);
  const mrr = assinaturasAtivas.reduce(
    (sum, item) => sum + Number(item.valor_mensal || 0),
    0
  );
  const cobrancasPagas = cobrancas.filter(isPaidCharge);
  const receita90 = cobrancasPagas.reduce(
    (sum, item) => sum + Number(item.valor || 0),
    0
  );
  const cobrancasAbertas = cobrancas.filter(isOpenCharge);
  const nowIso = new Date().toISOString();
  const inadimplentes = cobrancasAbertas.filter(
    (item) => item.data_expiracao && item.data_expiracao < nowIso
  );
  const comandasFechadas = comandas.filter(
    (item) => String(item.status || "").toLowerCase() === "fechada"
  );
  const receitaOperacional90 = comandasFechadas.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );
  const onlineAppointments = agendamentos.filter((item) =>
    ["app_cliente", "online", "cliente"].includes(
      String(item.origem || "").toLowerCase()
    )
  );

  const topRevenue = Array.from(
    comandasFechadas.reduce((map, item) => {
      map.set(item.id_salao, (map.get(item.id_salao) || 0) + Number(item.total || 0));
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const riskRows = saude
    .filter(
      (item) =>
        Number(item.score_total || 0) < 60 ||
        Number(item.risco_cancelamento || 0) >= 50 ||
        Number(item.inadimplencia_risco || 0) >= 50 ||
        Number(item.tickets_abertos || 0) > 0
    )
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-blue-100">
          <BarChart3 size={14} />
          Relatórios nativos
        </div>
        <h1 className="mt-4 font-display text-[2rem] font-black">
          Growth, receita e risco direto do Supabase
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
          Os indicadores abaixo são calculados sobre o banco principal, sem espelhamento ou servidor auxiliar.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Salões ativos" value={String(saloesAtivos)} hint={`${saloesNovos30} novo(s) em 30 dias.`} icon={Scissors} tone="blue" />
        <KpiCard label="MRR estimado" value={formatMoney(mrr)} hint={`${assinaturasAtivas.length} assinatura(s) ativa(s).`} icon={TrendingUp} tone="green" />
        <KpiCard label="Receita SaaS 90d" value={formatMoney(receita90)} hint={`${cobrancasPagas.length} cobrança(s) paga(s).`} icon={CircleDollarSign} tone="green" />
        <KpiCard label="Inadimplência" value={String(inadimplentes.length)} hint={`${cobrancasAbertas.length} cobrança(s) ainda aberta(s).`} icon={AlertTriangle} tone={inadimplentes.length ? "amber" : "white"} />
        <KpiCard label="Agendamentos 90d" value={String(agendamentos.length)} hint={`${onlineAppointments.length} pelo app/online.`} icon={CalendarDays} tone="blue" />
        <KpiCard label="Comandas fechadas" value={String(comandasFechadas.length)} hint={`${formatMoney(receitaOperacional90)} movimentados.`} icon={CircleDollarSign} tone="white" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Receita operacional</div>
            <h2 className="mt-2 font-display text-2xl font-black">Salões com maior receita em 90 dias</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.15em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Salão</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Receita</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topRevenue.length ? topRevenue.map(([idSalao, total]) => {
                  const salao = saloesMap.get(idSalao);
                  return (
                    <tr key={idSalao}>
                      <td className="px-4 py-3 font-black">{salao?.nome || idSalao}</td>
                      <td className="px-4 py-3 text-zinc-600">{[salao?.cidade, salao?.estado].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="px-4 py-3 text-zinc-600">{salao?.plano || "-"}</td>
                      <td className="px-4 py-3 font-black">{formatMoney(total)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin-master/saloes/${idSalao}`} className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-2 text-xs font-black text-white">
                          Abrir <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhuma receita registrada no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[26px] border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.22em] opacity-65">Risco operacional</div>
          <h2 className="mt-2 font-display text-2xl font-black">Salões que merecem atenção</h2>
          <div className="mt-4 space-y-3">
            {riskRows.length ? riskRows.map((item) => (
              <Link key={item.id_salao} href={`/admin-master/saloes/${item.id_salao}`} className="block rounded-[20px] border border-red-200 bg-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{saloesMap.get(item.id_salao)?.nome || item.id_salao}</div>
                    <div className="mt-1 text-xs opacity-70">Atualizado: {formatDate(item.atualizado_em)}</div>
                  </div>
                  <span className="rounded-full bg-red-700 px-3 py-1 text-sm font-black text-white">{item.score_total}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold opacity-75">
                  <span>Uso: {item.uso_recente}</span>
                  <span>Inad.: {item.inadimplencia_risco}</span>
                  <span>Tickets: {item.tickets_abertos}</span>
                  <span>Churn: {item.risco_cancelamento}</span>
                </div>
              </Link>
            )) : (
              <div className="rounded-[20px] border border-red-200 bg-white/80 p-6 text-sm opacity-75">Nenhum salão em risco na amostra atual.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
