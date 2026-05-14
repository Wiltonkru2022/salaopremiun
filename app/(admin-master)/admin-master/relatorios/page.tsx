import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Scissors,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  getOracleVpsProfessionalsReport,
  getOracleVpsSalesReport,
} from "@/lib/oracle-vps/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SalonRow = {
  id: string;
  nome: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  plano: string | null;
  status: string | null;
  trial_ativo: boolean | null;
  created_at: string | null;
};

type SubscriptionRow = {
  id_salao: string;
  status: string;
  trial_ativo: boolean;
  valor_mensal: number;
  vencimento_em: string | null;
  trial_fim_em: string | null;
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

type LogRow = {
  id_salao: string | null;
  gravidade: string;
  modulo: string;
  criado_em: string;
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

function dateKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function percent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function salonName(map: Map<string, SalonRow>, id: string | null | undefined) {
  if (!id) return "Sem salão";
  return map.get(id)?.nome || id;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getVpsReportMetric(
  response: Awaited<ReturnType<typeof getOracleVpsSalesReport>>,
  key: string
) {
  if (!response.configured || !response.ok) return 0;
  const result = asRecord(response.result);
  const report = asRecord(result.relatorio);
  return asNumber(report[key]);
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

function MiniBar({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint: string;
}) {
  const width = max ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="rounded-[18px] border border-zinc-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-zinc-950">{label}</span>
        <span className="font-black text-zinc-700">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-950" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-500">{hint}</p>
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
    { data: logsData },
    { data: saudeData },
    oracleSalesReport,
    oracleProfessionalsReport,
  ] = await Promise.all([
    supabase
      .from("saloes")
      .select("id, nome, email, cidade, estado, plano, status, trial_ativo, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("assinaturas_saloes")
      .select("id_salao, status, trial_ativo, valor_mensal, vencimento_em, trial_fim_em")
      .limit(200),
    supabase
      .from("assinaturas_cobrancas")
      .select("id_salao, valor, status, created_at, pago_em, paid_em, data_expiracao")
      .gte("created_at", last90)
      .limit(300),
    supabase
      .from("agendamentos")
      .select("id_salao, status, origem, created_at, data")
      .gte("created_at", last90)
      .limit(300),
    supabase
      .from("comandas")
      .select("id_salao, status, total, created_at, fechada_em")
      .gte("created_at", last90)
      .limit(300),
    supabase
      .from("logs_sistema")
      .select("id_salao, gravidade, modulo, criado_em")
      .gte("criado_em", last30)
      .limit(300),
    supabase
      .from("score_saude_salao")
      .select("id_salao, score_total, uso_recente, inadimplencia_risco, tickets_abertos, risco_cancelamento, atualizado_em")
      .order("score_total", { ascending: true })
      .limit(100),
    getOracleVpsSalesReport(),
    getOracleVpsProfessionalsReport(),
  ]);

  const saloes = ((saloesData || []) as SalonRow[]) || [];
  const assinaturas = ((assinaturasData || []) as SubscriptionRow[]) || [];
  const cobrancas = ((cobrancasData || []) as ChargeRow[]) || [];
  const agendamentos = ((agendamentosData || []) as AppointmentRow[]) || [];
  const comandas = ((comandasData || []) as SaleRow[]) || [];
  const logs = ((logsData || []) as LogRow[]) || [];
  const saude = ((saudeData || []) as HealthRow[]) || [];
  const saloesMap = new Map(saloes.map((salao) => [salao.id, salao]));

  const saloesNovos30 = saloes.filter((salao) => salao.created_at && salao.created_at >= last30);
  const saloesAtivos = saloes.filter((salao) => String(salao.status || "").toLowerCase() !== "excluido");
  const assinaturasAtivas = assinaturas.filter(isActiveSubscription);
  const mrr = assinaturasAtivas.reduce((sum, item) => sum + Number(item.valor_mensal || 0), 0);
  const cobrancasPagas = cobrancas.filter(isPaidCharge);
  const receita90 = cobrancasPagas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const cobrancasAbertas = cobrancas.filter(isOpenCharge);
  const inadimplente = cobrancasAbertas.filter((item) => item.data_expiracao && item.data_expiracao < new Date().toISOString());
  const comandasFechadas = comandas.filter((item) => String(item.status || "").toLowerCase() === "fechada");
  const receitaSalao90 = comandasFechadas.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const errosAlta = logs.filter((log) => ["alta", "critica", "critical", "error"].includes(String(log.gravidade || "").toLowerCase()));
  const onlineAppointments = agendamentos.filter((item) =>
    ["app_cliente", "online", "cliente"].includes(String(item.origem || "").toLowerCase())
  );
  const churnSuspeito = assinaturas.filter((item) =>
    ["cancelada", "cancelado", "inativa", "inactive", "canceled"].includes(String(item.status || "").toLowerCase())
  );
  const saloesEmRisco = saude
    .filter(
      (item) =>
        Number(item.score_total || 0) < 60 ||
        Number(item.risco_cancelamento || 0) >= 50 ||
        Number(item.inadimplencia_risco || 0) >= 50 ||
        Number(item.tickets_abertos || 0) > 0
    )
    .slice(0, 8);

  const growthByDay = new Map<string, number>();
  saloesNovos30.forEach((salao) => {
    const key = dateKey(salao.created_at);
    if (key) growthByDay.set(key, (growthByDay.get(key) || 0) + 1);
  });
  const maxGrowth = Math.max(...Array.from(growthByDay.values()), 1);

  const usageModules = [
    {
      label: "Agenda",
      value: agendamentos.filter((item) => (item.created_at || item.data) >= last30).length,
      hint: "Agendamentos criados nos últimos 30 dias.",
    },
    {
      label: "Caixa e comandas",
      value: comandas.filter((item) => item.created_at >= last30).length,
      hint: "Comandas abertas ou fechadas nos últimos 30 dias.",
    },
    {
      label: "Vendas fechadas",
      value: comandasFechadas.filter((item) => (item.fechada_em || item.created_at) >= last30).length,
      hint: "Comandas fechadas no período.",
    },
    {
      label: "App cliente",
      value: onlineAppointments.length,
      hint: "Agendamentos vindos do app/online.",
    },
    {
      label: "Logs de erro",
      value: errosAlta.length,
      hint: "Ocorrências altas/criticas nos últimos 30 dias.",
    },
  ];
  const maxModuleUse = Math.max(...usageModules.map((item) => item.value), 1);
  const oracleSalesCount = getVpsReportMetric(oracleSalesReport, "totalRegistros");
  const oracleProfessionalCount = getVpsReportMetric(
    oracleProfessionalsReport,
    "totalCalculos"
  );
  const oracleConfigured =
    oracleSalesReport.configured && oracleProfessionalsReport.configured;
  const oracleOnline = oracleSalesReport.ok && oracleProfessionalsReport.ok;

  const topRevenueSalons = Array.from(
    comandasFechadas.reduce((map, item) => {
      map.set(item.id_salao, (map.get(item.id_salao) || 0) + Number(item.total || 0));
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-blue-100">
              <BarChart3 size={14} />
              Relatórios
            </div>
            <h1 className="mt-4 font-display text-[2rem] font-black">
              Growth, receita e risco
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              Visão executiva do SaaS: crescimento, MRR, churn, uso por módulo,
              salões em risco e receita operacional movimentada pelos salões.
            </p>
          </div>
          <Link
            href="/admin-master/financeiro"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Abrir financeiro
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="MRR estimado"
          value={formatMoney(mrr)}
          hint={`${assinaturasAtivas.length} assinaturas ativas/trial.`}
          icon={CircleDollarSign}
          tone="green"
        />
        <KpiCard
          label="Novos salões"
          value={String(saloesNovos30.length)}
          hint={`${percent(saloesNovos30.length, saloesAtivos.length)} da base ativa nos últimos 30 dias.`}
          icon={TrendingUp}
          tone="blue"
        />
        <KpiCard
          label="Churn suspeito"
          value={String(churnSuspeito.length)}
          hint="Assinaturas canceladas ou inativas na base carregada."
          icon={TrendingDown}
          tone={churnSuspeito.length ? "red" : "white"}
        />
        <KpiCard
          label="Inadimplência"
          value={String(inadimplente.length)}
          hint={`${formatMoney(cobrancasAbertas.reduce((sum, item) => sum + Number(item.valor || 0), 0))} em cobranças abertas.`}
          icon={AlertTriangle}
          tone={inadimplente.length ? "amber" : "white"}
        />
      </section>

      <section className="rounded-[24px] border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              <Activity size={14} />
              Oracle VPS
            </div>
            <h2 className="mt-3 font-display text-2xl font-black">
              Relatório espelhado na VPS
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-blue-800/80">
              A Vercel continua sendo a fonte oficial. A VPS entra como leitura
              comparativa para validar relatórios leves antes de migrar cálculos
              maiores de vendas, profissionais e comissões.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-[18px] border border-blue-200 bg-white p-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                Status
              </div>
              <div className="mt-2 text-lg font-black">
                {oracleOnline
                  ? "Online"
                  : oracleConfigured
                    ? "Atenção"
                    : "Não configurada"}
              </div>
            </div>
            <div className="rounded-[18px] border border-blue-200 bg-white p-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                Vendas VPS
              </div>
              <div className="mt-2 text-lg font-black">{oracleSalesCount}</div>
            </div>
            <div className="rounded-[18px] border border-blue-200 bg-white p-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                Profissionais VPS
              </div>
              <div className="mt-2 text-lg font-black">{oracleProfessionalCount}</div>
            </div>
          </div>
        </div>
        {!oracleOnline ? (
          <p className="mt-3 rounded-[16px] border border-blue-200 bg-white/80 p-3 text-sm font-semibold text-blue-900">
            {oracleSalesReport.configured
              ? oracleSalesReport.error ||
                oracleProfessionalsReport.error ||
                "A VPS não respondeu aos relatórios leves agora."
              : "Configure ORACLE_VPS_API_URL e ORACLE_VPS_API_TOKEN para ativar esta leitura."}
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <TrendingUp size={16} />
              Crescimento dos últimos 30 dias
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {Array.from(growthByDay.entries()).length ? (
                Array.from(growthByDay.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([day, count]) => (
                    <MiniBar
                      key={day}
                      label={new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(`${day}T12:00:00.000Z`))}
                      value={count}
                      max={maxGrowth}
                      hint="Novos salões cadastrados."
                    />
                  ))
              ) : (
                <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">
                  Sem novos salões nos últimos 30 dias.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <Activity size={16} />
              Uso por módulo
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {usageModules.map((item) => (
                <MiniBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={maxModuleUse}
                  hint={item.hint}
                />
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-4">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
                <Scissors size={16} />
                Salões com maior receita operacional
              </div>
            </div>
            <div className="scroll-premium overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Salão</th>
                    <th className="px-4 py-3 font-bold">Cidade</th>
                    <th className="px-4 py-3 font-bold">Plano</th>
                    <th className="px-4 py-3 font-bold">Receita 90 dias</th>
                    <th className="px-4 py-3 font-bold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {topRevenueSalons.length ? (
                    topRevenueSalons.map(([idSalao, total]) => {
                      const salao = saloesMap.get(idSalao);
                      return (
                        <tr key={idSalao} className="hover:bg-zinc-50/80">
                          <td className="px-4 py-3 font-black text-zinc-950">
                            {salonName(saloesMap, idSalao)}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {[salao?.cidade, salao?.estado].filter(Boolean).join(" / ") || "-"}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{salao?.plano || "-"}</td>
                          <td className="px-4 py-3 font-black text-zinc-950">
                            {formatMoney(total)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin-master/saloes/${idSalao}`}
                              className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-950 px-3 text-xs font-black text-white"
                            >
                              Abrir salão
                              <ArrowUpRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        Nenhuma receita operacional registrada nos últimos 90 dias.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <CircleDollarSign size={16} />
              Receita SaaS
            </div>
            <div className="mt-4 grid gap-3">
              <MiniBar
                label="Receita paga 90 dias"
                value={Math.round(receita90)}
                max={Math.max(Math.round(receita90), Math.round(mrr), 1)}
                hint={formatMoney(receita90)}
              />
              <MiniBar
                label="Receita dos salões"
                value={Math.round(receitaSalao90)}
                max={Math.max(Math.round(receitaSalao90), 1)}
                hint={`${formatMoney(receitaSalao90)} movimentados nas comandas.`}
              />
              <MiniBar
                label="Cobranças abertas"
                value={cobrancasAbertas.length}
                max={Math.max(cobrancas.length, 1)}
                hint={`${percent(cobrancasAbertas.length, cobrancas.length)} das cobranças carregadas.`}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-950 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] opacity-70">
              <AlertTriangle size={16} />
              Salões em risco
            </div>
            <div className="mt-4 space-y-3">
              {saloesEmRisco.length ? (
                saloesEmRisco.map((item) => (
                  <Link
                    key={item.id_salao}
                    href={`/admin-master/saloes/${item.id_salao}`}
                    className="block rounded-[18px] border border-red-200 bg-white/70 p-3 transition hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black">{salonName(saloesMap, item.id_salao)}</div>
                        <div className="mt-1 text-xs font-semibold opacity-70">
                          Atualizado em {formatDate(item.atualizado_em)}
                        </div>
                      </div>
                      <div className="rounded-full bg-red-700 px-3 py-1 text-sm font-black text-white">
                        {item.score_total}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold opacity-75">
                      <span>Uso: {item.uso_recente}</span>
                      <span>Inad.: {item.inadimplencia_risco}</span>
                      <span>Tickets: {item.tickets_abertos}</span>
                      <span>Churn: {item.risco_cancelamento}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[18px] border border-red-200 bg-white/70 p-4 text-sm font-semibold opacity-75">
                  Nenhum salão em risco crítico na amostra atual.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <CalendarDays size={16} />
              Qualidade dos agendamentos
            </div>
            <div className="mt-4 grid gap-3">
              <MiniBar
                label="Total 90 dias"
                value={agendamentos.length}
                max={Math.max(agendamentos.length, 1)}
                hint="Agendamentos criados no período."
              />
              <MiniBar
                label="Online/app"
                value={onlineAppointments.length}
                max={Math.max(agendamentos.length, 1)}
                hint={`${percent(onlineAppointments.length, agendamentos.length)} vieram do app ou canal online.`}
              />
              <MiniBar
                label="Comanda fechada"
                value={comandasFechadas.length}
                max={Math.max(comandas.length, 1)}
                hint={`${percent(comandasFechadas.length, comandas.length)} das comandas carregadas.`}
              />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
