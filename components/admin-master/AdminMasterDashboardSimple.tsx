import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Headphones,
  HeartPulse,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { AdminKpi, AdminMasterDashboardInsight, AdminTableRow } from "@/lib/admin-master/data";
import type { AdminMasterOperationalSnapshot } from "@/lib/admin-master/operability";

type Props = {
  kpis: AdminKpi[];
  recentes: AdminTableRow[];
  planos: AdminTableRow[];
  operational: AdminMasterOperationalSnapshot;
  digitalizacao: AdminTableRow[];
  insights: AdminMasterDashboardInsight[];
  revenueTrend: number[];
};

function findKpi(kpis: AdminKpi[], label: string) {
  return kpis.find((kpi) => kpi.label.toLowerCase() === label.toLowerCase());
}

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function metricTone(tone?: AdminKpi["tone"]) {
  if (tone === "green") return "bg-emerald-50 text-emerald-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  if (tone === "red") return "bg-red-50 text-red-700";
  if (tone === "blue") return "bg-blue-50 text-blue-700";
  return "bg-violet-50 text-violet-700";
}

function healthClass(status: AdminMasterOperationalSnapshot["health"]["status"]) {
  if (status === "green") return "bg-emerald-500";
  if (status === "yellow") return "bg-amber-400";
  if (status === "orange") return "bg-orange-500";
  return "bg-red-500";
}

function MetricCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: AdminKpi["tone"];
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-500">{label}</p>
          <div className="mt-2 truncate text-2xl font-black tracking-tight text-zinc-950">
            {value}
          </div>
        </div>
        <div className={`rounded-xl p-2.5 ${metricTone(tone)}`}>
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{hint}</p>
    </div>
  );
}


function InsightCard({ insight }: { insight: AdminMasterDashboardInsight }) {
  const delta = insight.delta;
  const positive = typeof delta === "number" && delta >= 0;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
      <div className="text-xs font-semibold text-zinc-500">{insight.label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-xl font-black tracking-tight text-zinc-950">{insight.value}</div>
        {typeof delta === "number" ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {positive ? "+" : ""}{delta.toFixed(1).replace(".", ",")}%
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{insight.hint}</div>
    </div>
  );
}

function RevenueTrend({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const last7 = values.slice(-7).reduce((sum, value) => sum + value, 0);
  const last30 = values.reduce((sum, value) => sum + value, 0);
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-semibold text-zinc-500">Tendência de receita</div><div className="mt-1 text-lg font-black text-zinc-950">{money(last30)}</div></div>
        <div className="text-right text-[11px] text-zinc-500"><div>30 dias</div><div className="mt-1 font-bold text-violet-700">7d: {money(last7)}</div></div>
      </div>
      <div className="mt-4 flex h-16 items-end gap-1" aria-label="Receita diária dos últimos 30 dias">
        {values.map((value, index) => <span key={index} title={money(value)} className="min-w-0 flex-1 rounded-t bg-violet-200 transition hover:bg-violet-500" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />)}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Building2;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-md"
    >
      <div className="rounded-xl bg-zinc-100 p-2.5 text-zinc-600 transition group-hover:bg-violet-50 group-hover:text-violet-700">
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-zinc-900">{title}</div>
        <div className="mt-0.5 truncate text-xs text-zinc-500">{description}</div>
      </div>
      <ArrowRight size={17} className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
    </Link>
  );
}

function SmallStatus({
  title,
  value,
  description,
  href,
  danger = false,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition hover:shadow-md ${
        danger
          ? "border-red-200 bg-red-50/60 hover:border-red-300"
          : "border-zinc-200 bg-white hover:border-violet-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs font-semibold ${danger ? "text-red-700" : "text-zinc-500"}`}>
          {title}
        </span>
        <ArrowRight size={15} className={danger ? "text-red-400" : "text-zinc-300"} />
      </div>
      <div className={`mt-2 text-2xl font-black ${danger ? "text-red-900" : "text-zinc-950"}`}>
        {value}
      </div>
      <p className={`mt-1 text-xs leading-5 ${danger ? "text-red-700" : "text-zinc-500"}`}>
        {description}
      </p>
    </Link>
  );
}

export default function AdminMasterDashboardSimple({
  kpis,
  recentes,
  planos,
  operational,
  digitalizacao,
  insights,
  revenueTrend,
}: Props) {
  const totalSaloes = findKpi(kpis, "Total de salões");
  const trials = findKpi(kpis, "Trials ativos");
  const mrr = findKpi(kpis, "MRR atual");
  const receitaMes = findKpi(kpis, "Receita do mes");
  const tickets = findKpi(kpis, "Tickets abertos");
  const alertas = findKpi(kpis, "Alertas criticos");
  const digitalizacaoKpi = findKpi(kpis, "Taxa de digitalizacao");
  const primarySuggestion = operational.suggestions[0];
  const primaryIncident = operational.incidents[0];
  const recentSalons = recentes.slice(0, 5);
  const incidentes = operational.incidents.slice(0, 4);
  const alertCount = Number.parseInt(alertas?.value || "0", 10) || 0;
  const ticketCount = Number.parseInt(tickets?.value || "0", 10) || 0;
  const trialCount = Number.parseInt(trials?.value || "0", 10) || 0;
  const nextAction = primaryIncident || alertCount > 0
    ? { priority: "Crítico", title: primarySuggestion?.title || primaryIncident?.recommendedAction || "Resolver alertas críticos", detail: primarySuggestion?.detail || primaryIncident?.title || `${alertCount} alerta(s) exigem ação.`, href: "/admin-master/alertas", cta: "Resolver alerta", tone: "border-rose-200 bg-rose-50 text-rose-800" }
    : ticketCount > 0
      ? { priority: "Importante", title: "Responder fila de atendimento", detail: `${ticketCount} ticket(s) estão aguardando andamento.`, href: "/admin-master/tickets", cta: "Responder ticket", tone: "border-amber-200 bg-amber-50 text-amber-800" }
      : trialCount > 0
        ? { priority: "Oportunidade", title: "Acompanhar conversão de trials", detail: `${trialCount} trial(s) ativos podem virar receita recorrente.`, href: "/admin-master/assinaturas", cta: "Ver trials", tone: "border-blue-200 bg-blue-50 text-blue-800" }
        : { priority: "Estável", title: "Operação sem pendência crítica", detail: "Acompanhe saúde, receita e crescimento da base.", href: "/admin-master/saude", cta: "Ver saúde", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Resumo de hoje</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
              O que precisa da sua atenção
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-500">
              Receita, crescimento, suporte e estabilidade em uma leitura rápida.
            </p>
          </div>
          <Link
            href="/admin-master/relatorios"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-bold text-zinc-700 transition hover:border-violet-200 hover:text-violet-700 sm:self-auto"
          >
            Ver relatórios
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="MRR"
            value={mrr?.value || "-"}
            hint={mrr?.hint || "Receita recorrente mensal"}
            tone={mrr?.tone}
            icon={TrendingUp}
          />
          <MetricCard
            label="Receita do mês"
            value={receitaMes?.value || "-"}
            hint={receitaMes?.hint || "Cobranças recebidas no período"}
            tone={receitaMes?.tone}
            icon={Wallet}
          />
          <MetricCard
            label="Salões"
            value={totalSaloes?.value || "0"}
            hint={totalSaloes?.hint || "Contas cadastradas na plataforma"}
            tone={totalSaloes?.tone}
            icon={Building2}
          />
          <MetricCard
            label="Trials ativos"
            value={trials?.value || "0"}
            hint={trials?.hint || "Oportunidades em período de teste"}
            tone={trials?.tone}
            icon={Users}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-base font-black text-zinc-950">Movimento do negócio</h3><p className="mt-0.5 text-xs text-zinc-500">Comparativos, conversão, churn e eficiência financeira.</p></div><Link href="/admin-master/relatorios" className="text-xs font-bold text-violet-700">Análise completa</Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.slice(0, 6).map((insight) => <InsightCard key={insight.label} insight={insight} />)}
          <div className="sm:col-span-2"><RevenueTrend values={revenueTrend} /></div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${healthClass(operational.health.status)}`} />
                <h3 className="text-base font-black text-zinc-950">Saúde da plataforma</h3>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Visão operacional sem abrir a área técnica.</p>
            </div>
            <Link
              href="/admin-master/saude"
              className="text-sm font-bold text-violet-700 hover:text-violet-900"
            >
              Abrir saúde
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-zinc-50 p-3.5">
              <div className="text-xs text-zinc-500">Score</div>
              <div className="mt-1 text-2xl font-black text-zinc-950">{operational.health.score}</div>
              <div className="mt-1 text-xs font-semibold text-zinc-600">{operational.health.label}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3.5">
              <div className="text-xs text-zinc-500">Incidentes</div>
              <div className="mt-1 text-2xl font-black text-zinc-950">{operational.health.openIncidents}</div>
              <div className="mt-1 text-xs text-zinc-500">abertos agora</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3.5">
              <div className="text-xs text-zinc-500">Salões afetados</div>
              <div className="mt-1 text-2xl font-black text-zinc-950">{operational.health.impactedSalons}</div>
              <div className="mt-1 text-xs text-zinc-500">com impacto detectado</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3.5">
              <div className="text-xs text-zinc-500">Erro 24h</div>
              <div className="mt-1 text-2xl font-black text-zinc-950">
                {operational.health.errorRate24h.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-zinc-500">taxa geral</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-violet-700"><Sparkles size={17} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Próxima ação</span></div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${nextAction.tone}`}>{nextAction.priority}</span>
          </div>
          <h3 className="mt-3 text-xl font-black leading-tight text-zinc-950">{nextAction.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{nextAction.detail}</p>
          <Link href={nextAction.href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3.5 py-2 text-sm font-black text-white transition hover:bg-violet-800">{nextAction.cta}<ArrowRight size={16} /></Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-zinc-950">Pendências</h3>
          <span className="text-xs text-zinc-500">Clique apenas no que precisa resolver</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallStatus
            title="Alertas críticos"
            value={alertas?.value || "0"}
            description={alertas?.hint || "Falhas e avisos importantes"}
            href="/admin-master/alertas"
            danger={Number.parseInt(alertas?.value || "0", 10) > 0}
          />
          <SmallStatus
            title="Tickets abertos"
            value={tickets?.value || "0"}
            description={tickets?.hint || "Atendimentos aguardando ação"}
            href="/admin-master/tickets"
          />
          <SmallStatus
            title="App cliente"
            value={digitalizacaoKpi?.value || "0%"}
            description={digitalizacaoKpi?.hint || "Base conectada ao aplicativo"}
            href="/admin-master/relatorios"
          />
          <SmallStatus
            title="Cadastros para revisar"
            value={String(digitalizacao.length)}
            description="Possíveis vínculos ou telefones duplicados"
            href="/admin-master/relatorios"
            danger={digitalizacao.length > 0}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-950">Incidentes recentes</h3>
              <p className="mt-1 text-xs text-zinc-500">Somente os itens mais importantes.</p>
            </div>
            <Link href="/admin-master/alertas" className="text-sm font-bold text-violet-700">
              Ver todos
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {incidentes.length ? (
              incidentes.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-zinc-900">{item.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {item.module} · {item.severity} · {item.occurrences} ocorrência(s)
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 size={19} />
                <div>
                  <div className="text-sm font-bold">Nenhum incidente aberto</div>
                  <div className="mt-0.5 text-xs text-emerald-700">A plataforma está sem incidente relevante no snapshot atual.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-950">Salões recentes</h3>
              <p className="mt-1 text-xs text-zinc-500">Últimas contas adicionadas.</p>
            </div>
            <Link href="/admin-master/saloes" className="text-sm font-bold text-violet-700">
              Ver salões
            </Link>
          </div>

          <div className="mt-4 divide-y divide-zinc-100">
            {recentSalons.length ? (
              recentSalons.map((row, index) => (
                <div key={`${asText(row.salao)}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                    <Building2 size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-zinc-900">{asText(row.salao)}</div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {asText(row.plano)} · {asText(row.status)}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] text-zinc-400">{asText(row.criado)}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Nenhum salão recente.</div>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-black text-zinc-950">Acessos rápidos</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink
            href="/admin-master/assinaturas/cobrancas"
            title="Cobranças"
            description="Pagamentos e inadimplência"
            icon={CreditCard}
          />
          <QuickLink
            href="/admin-master/tickets"
            title="Suporte"
            description="Tickets que precisam de resposta"
            icon={Headphones}
          />
          <QuickLink
            href="/admin-master/saude"
            title="Saúde"
            description={`${operational.health.openIncidents} incidente(s) aberto(s)`}
            icon={HeartPulse}
          />
          <QuickLink
            href="/admin-master/planos"
            title="Planos"
            description={`${planos.length} plano(s) carregado(s)`}
            icon={Smartphone}
          />
        </div>
      </section>
    </div>
  );
}
