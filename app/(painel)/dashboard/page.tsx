"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLoading from "@/components/ui/AppLoading";
import { createClient } from "@/lib/supabase/client";
import { hasPermission } from "@/lib/auth/permissions";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Scissors,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { getPlanoMinimoParaRecurso, type PlanoCobravelCodigo } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";

type DashboardResumo = {
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

type PlanoAccessPayload = {
  recursos?: Record<string, boolean>;
};
type IconType = React.ComponentType<{
  size?: number;
  className?: string;
}>;

const RESUMO_INICIAL: DashboardResumo = {
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
};

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value?: number | null) {
  return `${Number(value || 0)}%`;
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

function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  tone = "default",
  loading = false,
}: {
  title: string;
  value: string;
  icon: IconType;
  subtitle: string;
  tone?: "default" | "success" | "warning" | "info";
  loading?: boolean;
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
    <div className={`rounded-[22px] border p-3.5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </div>
          <div className="mt-1.5 text-[1.7rem] font-bold tracking-[-0.04em] text-zinc-950">
            {loading ? "..." : value}
          </div>
          <div className="mt-1.5 text-sm text-zinc-500">{subtitle}</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-700">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function InfoMetric({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {title}
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{helper}</div>
    </div>
  );
}

function MiniStatusCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-zinc-100 p-2.5">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            {title}
          </div>
          <div className="mt-1 text-lg font-bold text-zinc-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

function UpgradeActions({
  plan = getPlanoMinimoParaRecurso("dashboard_avancado"),
}: {
  plan?: PlanoCobravelCodigo;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a
        href="/comparar-planos"
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
      >
        Comparar planos
      </a>
      <a
        href={getAssinaturaUrl(`/assinatura?plano=${plan}`)}
        className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Fazer upgrade
      </a>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [semPermissao, setSemPermissao] = useState(false);
  const [faseCarregamento, setFaseCarregamento] = useState(
    "Carregando resumo principal do salao."
  );
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [resumo, setResumo] = useState<DashboardResumo>(RESUMO_INICIAL);
  const [dashboardAvancado, setDashboardAvancado] = useState(false);

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setSemPermissao(false);
      setResumo(RESUMO_INICIAL);
      setFaseCarregamento("Validando acesso ao painel.");

      const [{ data, error }, planoResponse] = await Promise.all([
        supabase.rpc("fn_dashboard_resumo_painel"),
        fetch("/api/plano/access", { cache: "no-store" }),
      ]);

      if (error) {
        throw error;
      }

      const planoData = (await planoResponse.json().catch(() => null)) as
        | PlanoAccessPayload
        | null;
      setDashboardAvancado(Boolean(planoData?.recursos?.dashboard_avancado));

      const rpcData = (data || {}) as DashboardRpcResumo;
      const nivelUsuario = (rpcData.usuario?.nivel ?? null) as
        | "admin"
        | "gerente"
        | "profissional"
        | "recepcao"
        | null;

      if (!hasPermission(nivelUsuario, "dashboard_ver")) {
        setSemPermissao(true);
        return;
      }

      if (!rpcData.usuario?.id_salao) {
        throw new Error("Nao foi possivel identificar o salao do usuario.");
      }

      setFaseCarregamento("Carregando indicadores principais.");
      setResumo({
        ...RESUMO_INICIAL,
        ...rpcData.resumo,
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
      });
      setUltimaAtualizacao(new Date().toISOString());
      setFaseCarregamento("Resumo atualizado.");
      setLoading(false);
    } catch (error: unknown) {
      console.error(error);
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void init();
  }, [init]);

  const statusCaixa = useMemo(() => {
    return resumo.aguardandoPagamento > 0 ? "Com pendencias" : "Organizado";
  }, [resumo.aguardandoPagamento]);
  const dashboardUpgradePlan = useMemo(
    () => getDashboardUpgradePlan(resumo.planoSalao),
    [resumo.planoSalao]
  );
  const dashboardUpgradeLabel =
    dashboardUpgradePlan === "premium" ? "Premium" : "Pro";

  if (loading) {
    return (
      <AppLoading
        title="Carregando dashboard"
        message={faseCarregamento}
        fullHeight={false}
      />
    );
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
              <p className="mt-2 text-sm text-zinc-500">
                Voce nao tem permissao para visualizar o dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Resumo do salao
            </div>
            <h1 className="mt-1.5 text-[1.85rem] font-bold tracking-[-0.04em] text-zinc-950">
              Dashboard
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              O painel abre primeiro com o essencial e termina o restante em
              segundo plano para voce entrar mais rapido no sistema.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:min-w-[400px]">
            <InfoMetric
              title="Status do carregamento"
              value="Pronto"
              helper={faseCarregamento}
            />
            <InfoMetric
              title="Ultima leitura"
              value={
                ultimaAtualizacao
                  ? new Date(ultimaAtualizacao).toLocaleTimeString("pt-BR")
                  : "--:--"
              }
              helper={`Plano ${resumo.planoSalao || "-"}`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Agendamentos hoje"
          value={String(resumo.agendamentosHoje)}
          icon={CalendarDays}
          subtitle={`${resumo.proximosConfirmados} confirmados nas proximas 2 horas`}
          tone="info"
        />
        <KpiCard
          title="Clientes ativos"
          value={String(resumo.clientesAtivos)}
          icon={Users}
          subtitle="Base ativa do salao"
        />
        <KpiCard
          title="Servicos do mes"
          value={String(resumo.servicosMes)}
          icon={Scissors}
          subtitle="Comandas fechadas no periodo"
        />
        <KpiCard
          title="Faturamento do mes"
          value={formatCurrency(resumo.faturamentoMes)}
          icon={DollarSign}
          subtitle="Resultado real do periodo"
          tone="success"
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        {dashboardAvancado ? (
          <div className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Visao geral
                </div>
                <div className="mt-1 text-lg font-bold text-zinc-950">
                  Indicadores de operacao
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-700">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="mt-3.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <InfoMetric
                title="Ticket medio"
                value={formatCurrency(resumo.ticketMedioMes)}
                helper="Valor medio por comanda fechada"
              />
              <InfoMetric
                title="Comissao pendente"
                value={formatCurrency(resumo.comissaoPendenteMes)}
                helper="Pronto para conferencia"
              />
              <InfoMetric
                title="Caixa do dia"
                value={formatCurrency(resumo.caixaDia)}
                helper="Total fechado hoje"
              />
              <InfoMetric
                title="Retorno"
                value={formatPercent(resumo.retornoClientes)}
                helper="Recorrencia estimada no mes"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Dashboard avancado
                </div>
                <div className="mt-1 text-lg font-bold text-zinc-950">
                  Leitura premium liberada no {dashboardUpgradeLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-700">
                <TrendingUp size={18} />
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Ticket medio, retorno, comissao pendente e leitura gerencial mais
              forte entram no {dashboardUpgradeLabel} ou acima. O painel atual continua mostrando
              o essencial da operacao.
            </p>
            <UpgradeActions plan={dashboardUpgradePlan} />
          </div>
        )}

        <div className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Status rapido
              </div>
              <div className="mt-1 text-lg font-bold text-zinc-950">
                Leitura do dia
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-700">
              <Wallet size={18} />
            </div>
          </div>

          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
            <InfoMetric title="Caixa" value={statusCaixa} helper="Leitura operacional do recebimento" />
            <InfoMetric
              title="Profissionais"
              value={String(resumo.profissionaisAtivos)}
              helper="Ativos no cadastro"
            />
            <InfoMetric
              title="Aguardando pagamento"
              value={String(resumo.aguardandoPagamento)}
              helper="Comandas que pedem acao"
            />
            <InfoMetric
              title="Cancelamentos"
              value={dashboardAvancado ? String(resumo.cancelamentosMes) : "--"}
              helper={
                dashboardAvancado
                  ? "Ocorrencias no mes"
                  : "Disponivel no dashboard avancado"
              }
            />
          </div>
          {!dashboardAvancado ? (
            <div className="mt-3.5 rounded-[20px] border border-dashed border-zinc-200 bg-zinc-50 p-3.5">
              <div className="text-sm font-semibold text-zinc-900">
                Quer uma leitura mais gerencial?
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                O dashboard avancado libera ticket medio, cancelamentos, retorno
                e outros indicadores de crescimento.
              </div>
              <UpgradeActions plan={dashboardUpgradePlan} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStatusCard
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
          title="Caixa do dia"
          value={formatCurrency(resumo.caixaDia)}
        />
        <MiniStatusCard
          icon={<CreditCard size={18} className="text-amber-600" />}
          title="Comissao pendente"
          value={
            dashboardAvancado
              ? formatCurrency(resumo.comissaoPendenteMes)
              : dashboardUpgradeLabel
          }
        />
        <MiniStatusCard
          icon={<AlertCircle size={18} className="text-rose-600" />}
          title="Aguardando pagamento"
          value={String(resumo.aguardandoPagamento)}
        />
        <MiniStatusCard
          icon={<UserCheck size={18} className="text-sky-600" />}
          title="Profissionais ativos"
          value={String(resumo.profissionaisAtivos)}
        />
      </section>
    </div>
  );
}
