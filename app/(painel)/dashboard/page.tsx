"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  DollarSign,
  RefreshCw,
  Scissors,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import AppLoading from "@/components/ui/AppLoading";
import { getPlanoMinimoParaRecurso, type PlanoCobravelCodigo } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";

type DashboardPeriodo = "hoje" | "7d" | "mes" | "ano";

type AgendaResumoItem = {
  id: string;
  data?: string | null;
  horario: string;
  cliente: string;
  profissional: string;
  servico: string;
  status: string;
};

type DashboardResumo = {
  periodo: DashboardPeriodo;
  periodoLabel: string;
  agendamentosHoje: number;
  proximosConfirmados: number;
  clientesAtivos: number;
  servicosMes: number;
  faturamentoMes: number;
  ticketMedioMes: number;
  comissaoPendenteMes: number;
  caixaDia: number;
  retornoClientes: number;
  profissionaisAtivos: number;
  cancelamentosMes: number;
  aguardandoPagamento: number;
  planoSalao: string;
  notificacoesPendentes: number;
  agendaHoje: AgendaResumoItem[];
  proximosAgendamentos: AgendaResumoItem[];
  topProfissionais: Array<{ nome: string; total: number; atendimentos: number }>;
  servicosMaisAgendados: Array<{ nome: string; total: number; receita: number }>;
  clientesInativos: Array<{
    id: string;
    nome: string;
    contato: string;
    ultimaVisita: string | null;
    diasSemVir: number;
  }>;
  clientesSemVir45Dias: number;
  faturamentoSerie: Array<{ data: string; total: number }>;
  metaMensal: number;
};

type DashboardRpcResumo = {
  usuario?: {
    id?: string;
    id_salao?: string | null;
    nivel?: string | null;
    status?: string | null;
  };
  resumo?: Partial<DashboardResumo>;
};

type DashboardClientCachePayload = {
  resumo: DashboardResumo;
  dashboardAvancado: boolean;
  ultimaAtualizacao: string;
};

type IconType = React.ComponentType<{
  size?: number;
  className?: string;
}>;

const DASHBOARD_CLIENT_CACHE_TTL_MS = 30 * 1000;
const DASHBOARD_CLIENT_CACHE_PREFIX = "salaopremium:dashboard:";

const PERIODOS_DASHBOARD: Array<{ value: DashboardPeriodo; label: string; helper: string }> = [
  { value: "hoje", label: "Hoje", helper: "Operação do dia" },
  { value: "7d", label: "7 dias", helper: "Ritmo recente" },
  { value: "mes", label: "Mês", helper: "Visão comercial" },
  { value: "ano", label: "Ano", helper: "Crescimento" },
];

const RESUMO_INICIAL: DashboardResumo = {
  periodo: "mes",
  periodoLabel: "Mês atual",
  agendamentosHoje: 0,
  proximosConfirmados: 0,
  clientesAtivos: 0,
  servicosMes: 0,
  faturamentoMes: 0,
  ticketMedioMes: 0,
  comissaoPendenteMes: 0,
  caixaDia: 0,
  retornoClientes: 0,
  profissionaisAtivos: 0,
  cancelamentosMes: 0,
  aguardandoPagamento: 0,
  planoSalao: "-",
  notificacoesPendentes: 0,
  agendaHoje: [],
  proximosAgendamentos: [],
  topProfissionais: [],
  servicosMaisAgendados: [],
  clientesInativos: [],
  clientesSemVir45Dias: 0,
  faturamentoSerie: [],
  metaMensal: 0,
};

function getDashboardCacheKey(idSalao: string, periodo: DashboardPeriodo) {
  return `${DASHBOARD_CLIENT_CACHE_PREFIX}${idSalao}:${periodo}`;
}

function readDashboardClientCache(idSalao: string, periodo: DashboardPeriodo): DashboardClientCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(getDashboardCacheKey(idSalao, periodo));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardClientCachePayload;
    if (!parsed?.ultimaAtualizacao || !parsed?.resumo) return null;
    const age = Date.now() - new Date(parsed.ultimaAtualizacao).getTime();
    return Number.isFinite(age) && age <= DASHBOARD_CLIENT_CACHE_TTL_MS ? parsed : null;
  } catch {
    return null;
  }
}

function writeDashboardClientCache(
  idSalao: string,
  periodo: DashboardPeriodo,
  payload: DashboardClientCachePayload
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(getDashboardCacheKey(idSalao, periodo), JSON.stringify(payload));
  } catch {
    // Cache local é apenas um conforto visual.
  }
}

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value?: number | null) {
  return `${Number(value || 0)}%`;
}

function formatShortDate(value?: string | null) {
  const raw = String(value || "");
  if (!raw) return "Sem data";
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-");
    return `${month}/${year.slice(2)}`;
  }
  const iso = raw.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!day || !month || !year) return "Sem data";
  return `${day}/${month}`;
}

function normalizePlanCode(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function getDashboardUpgradePlan(planoSalao?: string | null): PlanoCobravelCodigo {
  const minimo = getPlanoMinimoParaRecurso("dashboard_avancado");
  return normalizePlanCode(planoSalao) === minimo ? "premium" : minimo;
}

function statusBadgeClass(status: string) {
  const normalized = normalizePlanCode(status);
  if (normalized.includes("confirmado")) return "bg-emerald-100 text-emerald-800";
  if (normalized.includes("pendente")) return "bg-amber-100 text-amber-800";
  if (normalized.includes("atendido")) return "bg-sky-100 text-sky-800";
  return "bg-zinc-100 text-zinc-700";
}

function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: IconType;
  subtitle: string;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-zinc-200 bg-white";

  return (
    <div className={`min-w-0 rounded-[24px] border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{title}</p>
          <strong className="mt-2 block break-words text-[1.85rem] font-black leading-none tracking-[-0.05em] text-zinc-950">
            {value}
          </strong>
          <p className="mt-2 text-sm leading-5 text-zinc-500">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-800">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function InfoMetric({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">{title}</p>
      <strong className="mt-1 block break-words text-lg font-black text-zinc-950">{value}</strong>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p>
    </div>
  );
}

function MiniStatusCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-2xl bg-zinc-100 p-2.5">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{title}</p>
          <strong className="mt-1 block truncate text-base font-black text-zinc-950">{value}</strong>
        </div>
      </div>
    </div>
  );
}

function UpgradeActions({ plan = getPlanoMinimoParaRecurso("dashboard_avancado") }: { plan?: PlanoCobravelCodigo }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a
        href="/comparar-planos"
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-black text-zinc-800 transition hover:bg-zinc-50"
      >
        Comparar planos
      </a>
      <a
        href={getAssinaturaUrl(`/assinatura?plano=${plan}`)}
        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-zinc-100"
      >
        Fazer upgrade
      </a>
    </div>
  );
}

function LockedPanel({ plan }: { plan: PlanoCobravelCodigo }) {
  return (
    <div className="relative min-h-full overflow-hidden rounded-[28px] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="rounded-2xl bg-white/10 p-3 text-amber-200">
          <Crown size={22} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">Dashboard avançado</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">
            Liberado no {plan === "premium" ? "Premium" : "Pro"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Rankings, clientes sem retorno, curva de faturamento e leitura executiva ficam nos planos mais completos.
          </p>
          <UpgradeActions plan={plan} />
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: DashboardResumo["faturamentoSerie"] }) {
  const rows = data.length ? data : Array.from({ length: 7 }, (_, index) => ({ data: String(index), total: 0 }));
  const max = Math.max(...rows.map((item) => Number(item.total || 0)), 1);
  const total = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="rounded-[24px] border border-zinc-100 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Total no gráfico</span>
        <strong className="text-sm font-black text-zinc-950">{formatCurrency(total)}</strong>
      </div>
      <div className="flex h-44 items-end gap-2">
        {rows.map((item) => {
          const height = Math.max(10, Math.round((Number(item.total || 0) / max) * 100));
          return (
            <div key={item.data} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t-2xl bg-gradient-to-t from-zinc-950 via-zinc-800 to-amber-400 shadow-sm transition-all"
                  style={{ height: `${height}%` }}
                  title={formatCurrency(item.total)}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] font-bold text-zinc-400">
                {formatShortDate(item.data)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingItem({
  title,
  value,
  helper,
  index,
}: {
  title: string;
  value: string;
  helper: string;
  index: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-zinc-950">{title}</p>
        <p className="truncate text-xs font-semibold text-zinc-500">{helper}</p>
      </div>
      <strong className="shrink-0 text-sm font-black text-zinc-950">{value}</strong>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { snapshot: painelSession } = usePainelSession();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [semPermissao, setSemPermissao] = useState(false);
  const [faseCarregamento, setFaseCarregamento] = useState("Carregando resumo principal do salão.");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [resumo, setResumo] = useState<DashboardResumo>(RESUMO_INICIAL);
  const [dashboardAvancado, setDashboardAvancado] = useState(false);
  const [periodo, setPeriodo] = useState<DashboardPeriodo>("mes");

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setSemPermissao(false);
      setResumo((current) => ({ ...RESUMO_INICIAL, periodo, periodoLabel: current.periodoLabel }));
      setFaseCarregamento("Validando acesso ao painel.");

      if (!painelSession?.idSalao) {
        throw new Error("Não foi possível identificar o salão do usuário.");
      }

      if (!painelSession.permissoes?.dashboard_ver) {
        setSemPermissao(true);
        return;
      }

      const planoCodigo = normalizePlanCode(painelSession.planoCodigo || "");
      const planoPermiteAvancado =
        planoCodigo === "teste_gratis" || planoCodigo === "trial" || planoCodigo === "pro" || planoCodigo === "premium";
      const recursoDashboardAvancado = painelSession.planoRecursos?.dashboard_avancado;
      const dashboardAvancadoSession =
        recursoDashboardAvancado === true || (recursoDashboardAvancado !== false && planoPermiteAvancado);
      setDashboardAvancado(dashboardAvancadoSession);

      const cached = readDashboardClientCache(painelSession.idSalao, periodo);
      if (cached) {
        setResumo(cached.resumo);
        setDashboardAvancado(cached.dashboardAvancado);
        setUltimaAtualizacao(cached.ultimaAtualizacao);
        setFaseCarregamento("Resumo recente reaproveitado.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/painel/dashboard-resumo?periodo=${periodo}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as DashboardRpcResumo | { error?: string };

      if (!response.ok) {
        const errorMessage = "error" in payload ? payload.error : "Erro ao carregar dashboard.";
        throw new Error(errorMessage || "Erro ao carregar dashboard.");
      }

      const rpcData = payload as DashboardRpcResumo;
      setFaseCarregamento("Carregando indicadores principais.");
      const nextResumo: DashboardResumo = {
        ...RESUMO_INICIAL,
        ...rpcData.resumo,
        periodo,
        periodoLabel: String(rpcData.resumo?.periodoLabel || RESUMO_INICIAL.periodoLabel),
        agendamentosHoje: Number(rpcData.resumo?.agendamentosHoje || 0),
        proximosConfirmados: Number(rpcData.resumo?.proximosConfirmados || 0),
        clientesAtivos: Number(rpcData.resumo?.clientesAtivos || 0),
        servicosMes: Number(rpcData.resumo?.servicosMes || 0),
        faturamentoMes: Number(rpcData.resumo?.faturamentoMes || 0),
        ticketMedioMes: Number(rpcData.resumo?.ticketMedioMes || 0),
        comissaoPendenteMes: Number(rpcData.resumo?.comissaoPendenteMes || 0),
        caixaDia: Number(rpcData.resumo?.caixaDia || 0),
        retornoClientes: Number(rpcData.resumo?.retornoClientes || 0),
        profissionaisAtivos: Number(rpcData.resumo?.profissionaisAtivos || 0),
        cancelamentosMes: Number(rpcData.resumo?.cancelamentosMes || 0),
        aguardandoPagamento: Number(rpcData.resumo?.aguardandoPagamento || 0),
        planoSalao: String(rpcData.resumo?.planoSalao || "-"),
        notificacoesPendentes: Number(rpcData.resumo?.notificacoesPendentes || 0),
        agendaHoje: Array.isArray(rpcData.resumo?.agendaHoje) ? rpcData.resumo.agendaHoje : [],
        proximosAgendamentos: Array.isArray(rpcData.resumo?.proximosAgendamentos)
          ? rpcData.resumo.proximosAgendamentos
          : [],
        topProfissionais: Array.isArray(rpcData.resumo?.topProfissionais) ? rpcData.resumo.topProfissionais : [],
        servicosMaisAgendados: Array.isArray(rpcData.resumo?.servicosMaisAgendados)
          ? rpcData.resumo.servicosMaisAgendados
          : [],
        clientesInativos: Array.isArray(rpcData.resumo?.clientesInativos) ? rpcData.resumo.clientesInativos : [],
        clientesSemVir45Dias: Number(rpcData.resumo?.clientesSemVir45Dias || 0),
        faturamentoSerie: Array.isArray(rpcData.resumo?.faturamentoSerie) ? rpcData.resumo.faturamentoSerie : [],
        metaMensal: Number(rpcData.resumo?.metaMensal || 0),
      };
      const nowIso = new Date().toISOString();

      setResumo(nextResumo);
      setUltimaAtualizacao(nowIso);
      writeDashboardClientCache(painelSession.idSalao, periodo, {
        resumo: nextResumo,
        dashboardAvancado: dashboardAvancadoSession,
        ultimaAtualizacao: nowIso,
      });
      setFaseCarregamento("Resumo atualizado.");
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [painelSession, periodo]);

  useEffect(() => {
    void init();
  }, [init]);

  const statusCaixa = useMemo(
    () => (resumo.aguardandoPagamento > 0 ? "Com pendências" : "Organizado"),
    [resumo.aguardandoPagamento]
  );
  const dashboardUpgradePlan = useMemo(() => getDashboardUpgradePlan(resumo.planoSalao), [resumo.planoSalao]);
  const dashboardUpgradeLabel = dashboardUpgradePlan === "premium" ? "Premium" : "Pro";
  const kpiPeriodoLabel = resumo.periodoLabel || PERIODOS_DASHBOARD.find((item) => item.value === periodo)?.label || "Período";

  if (loading) {
    return <AppLoading title="Carregando dashboard" message={faseCarregamento} fullHeight={false} />;
  }

  if (semPermissao) {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-100 p-3">
              <ShieldAlert size={24} className="text-rose-600" />
            </div>
            <div>
              <h1 className="text-[1.6rem] font-bold text-zinc-900">Acesso negado</h1>
              <p className="mt-2 text-sm text-zinc-500">Você não tem permissão para visualizar o dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</div>
      ) : null}

      <section className="relative overflow-hidden rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-100/80 blur-3xl" />
        <div className="relative flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
              <Sparkles size={13} />
              Comando do salão
            </div>
            <h1 className="mt-3 text-[2.35rem] font-black tracking-[-0.05em] text-zinc-950">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Visão executiva do salão: agenda, faturamento, clientes sem retorno, profissionais em destaque e
              serviços com mais procura.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {PERIODOS_DASHBOARD.map((option) => {
                const active = periodo === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriodo(option.value)}
                    className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    <span className="block text-sm font-black">{option.label}</span>
                    <span className={`mt-0.5 block text-[11px] font-bold ${active ? "text-zinc-300" : "text-zinc-400"}`}>
                      {option.helper}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 2xl:min-w-[430px]">
            <InfoMetric
              title="Plano"
              value={resumo.planoSalao || "-"}
              helper={dashboardAvancado ? "Dashboard avançado ativo" : `Avançado no ${dashboardUpgradeLabel}`}
            />
            <InfoMetric
              title="Última leitura"
              value={ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleTimeString("pt-BR") : "--:--"}
              helper={faseCarregamento}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Agendamentos"
          value={String(resumo.agendamentosHoje)}
          icon={CalendarDays}
          subtitle={`${resumo.proximosConfirmados} confirmados nas próximas 2 horas`}
          tone="info"
        />
        <KpiCard
          title="Clientes ativos"
          value={String(resumo.clientesAtivos)}
          icon={Users}
          subtitle="Base ativa do salão"
        />
        <KpiCard
          title="Serviços"
          value={String(resumo.servicosMes)}
          icon={Scissors}
          subtitle={`Comandas fechadas: ${kpiPeriodoLabel}`}
        />
        <KpiCard
          title="Faturamento"
          value={formatCurrency(resumo.faturamentoMes)}
          icon={DollarSign}
          subtitle={`Resultado real: ${kpiPeriodoLabel}`}
          tone="success"
        />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Agenda do dia</p>
              <h2 className="mt-1 text-xl font-black text-zinc-950">Horários em andamento</h2>
            </div>
            <div className="rounded-2xl bg-zinc-950 p-3 text-white">
              <Clock3 size={20} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {resumo.agendaHoje.map((item) => (
              <div key={item.id} className="min-w-0 rounded-[22px] border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{item.horario}</p>
                    <h3 className="mt-2 truncate text-base font-black text-zinc-950">{item.servico}</h3>
                    <p className="mt-1 truncate text-sm font-semibold text-zinc-500">{item.cliente}</p>
                    <p className="truncate text-xs text-zinc-400">{item.profissional}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${statusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
            {!resumo.agendaHoje.length ? (
              <div className="lg:col-span-2">
                <EmptyState>Nenhum horário ativo para hoje.</EmptyState>
              </div>
            ) : null}
          </div>
        </div>

        {dashboardAvancado ? (
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Curva financeira</p>
                <h2 className="mt-1 text-xl font-black text-zinc-950">Receita por período</h2>
              </div>
              <div className="rounded-2xl bg-zinc-950 p-3 text-white">
                <BarChart3 size={20} />
              </div>
            </div>

            <div className="mt-5">
              <MiniBarChart data={resumo.faturamentoSerie} />
            </div>
            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              <InfoMetric title="Ticket médio" value={formatCurrency(resumo.ticketMedioMes)} helper="Valor médio por comanda fechada" />
              <InfoMetric title="Comissão pendente" value={formatCurrency(resumo.comissaoPendenteMes)} helper="Pronto para conferência" />
              <InfoMetric title="Caixa do dia" value={formatCurrency(resumo.caixaDia)} helper="Total fechado hoje" />
              <InfoMetric title="Retorno" value={formatPercent(resumo.retornoClientes)} helper="Recorrência estimada" />
            </div>
          </div>
        ) : (
          <LockedPanel plan={dashboardUpgradePlan} />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Próximos horários</p>
              <h2 className="mt-1 text-xl font-black text-zinc-950">Agenda chegando</h2>
            </div>
            <div className="rounded-2xl bg-zinc-950 p-3 text-white">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {resumo.proximosAgendamentos.slice(0, 5).map((item) => (
              <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-xs font-black text-zinc-950">
                  <span>{formatShortDate(item.data)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-zinc-950">{item.cliente}</p>
                  <p className="truncate text-xs font-semibold text-zinc-500">{item.servico}</p>
                  <p className="text-xs text-zinc-400">{item.horario}</p>
                </div>
                <ArrowUpRight size={17} className="shrink-0 text-zinc-400" />
              </div>
            ))}
            {!resumo.proximosAgendamentos.length ? <EmptyState>Nenhum próximo horário encontrado.</EmptyState> : null}
          </div>
        </div>

        {dashboardAvancado ? (
          <>
            <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Top profissionais</p>
              <h2 className="mt-1 text-xl font-black text-zinc-950">Maior faturamento</h2>
              <div className="mt-4 space-y-3">
                {resumo.topProfissionais.map((item, index) => (
                  <RankingItem
                    key={`${item.nome}-${index}`}
                    index={index}
                    title={item.nome}
                    value={formatCurrency(item.total)}
                    helper={`${item.atendimentos} item(ns) vendidos`}
                  />
                ))}
                {!resumo.topProfissionais.length ? <EmptyState>Sem faturamento por profissional neste período.</EmptyState> : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Serviços em alta</p>
              <h2 className="mt-1 text-xl font-black text-zinc-950">Mais agendados</h2>
              <div className="mt-4 space-y-3">
                {resumo.servicosMaisAgendados.map((item, index) => (
                  <RankingItem
                    key={`${item.nome}-${index}`}
                    index={index}
                    title={item.nome}
                    value={`${item.total}`}
                    helper={`${formatCurrency(item.receita)} em receita`}
                  />
                ))}
                {!resumo.servicosMaisAgendados.length ? <EmptyState>Sem serviços fechados neste período.</EmptyState> : null}
              </div>
            </div>
          </>
        ) : (
          <LockedPanel plan={dashboardUpgradePlan} />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {dashboardAvancado ? (
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Clientes sem retorno</p>
                <h2 className="mt-1 text-xl font-black text-zinc-950">
                  {resumo.clientesSemVir45Dias} cliente(s) há 45+ dias sem vir
                </h2>
              </div>
              <div className="rounded-2xl bg-zinc-950 p-3 text-white">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {resumo.clientesInativos.map((cliente) => (
                <div key={cliente.id} className="min-w-0 rounded-[22px] border border-zinc-100 bg-zinc-50 p-4">
                  <p className="truncate text-sm font-black text-zinc-950">{cliente.nome}</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">{cliente.diasSemVir} dias sem atendimento</p>
                  <p className="mt-1 truncate text-xs text-zinc-400">{cliente.contato || "Sem contato cadastrado"}</p>
                </div>
              ))}
              {!resumo.clientesInativos.length ? (
                <div className="md:col-span-2">
                  <EmptyState>Nenhum cliente crítico encontrado na amostra recente.</EmptyState>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <LockedPanel plan={dashboardUpgradePlan} />
        )}

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Status rápido</p>
          <h2 className="mt-1 text-xl font-black text-zinc-950">Operação do dia</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStatusCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} title="Caixa" value={statusCaixa} />
            <MiniStatusCard
              icon={<CreditCard size={18} className="text-amber-600" />}
              title="Comissão"
              value={dashboardAvancado ? formatCurrency(resumo.comissaoPendenteMes) : dashboardUpgradeLabel}
            />
            <MiniStatusCard icon={<AlertCircle size={18} className="text-rose-600" />} title="Aguardando" value={String(resumo.aguardandoPagamento)} />
            <MiniStatusCard icon={<UserCheck size={18} className="text-sky-600" />} title="Profissionais" value={String(resumo.profissionaisAtivos)} />
            <MiniStatusCard icon={<Target size={18} className="text-zinc-700" />} title="Cancelamentos" value={String(resumo.cancelamentosMes)} />
            <MiniStatusCard icon={<TrendingUp size={18} className="text-emerald-700" />} title="Retorno" value={formatPercent(resumo.retornoClientes)} />
          </div>
          <button
            type="button"
            onClick={() => void init()}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-sm font-black text-zinc-950 transition hover:bg-zinc-50"
          >
            <RefreshCw size={16} />
            Atualizar leitura
          </button>
        </div>
      </section>
    </div>
  );
}
