"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLoading from "@/components/ui/AppLoading";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
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

type SalaoInfo = {
  id: string;
  plano?: string | null;
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
    <div className={`rounded-[26px] border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-[-0.04em] text-zinc-950">
            {loading ? "..." : value}
          </div>
          <div className="mt-2 text-sm text-zinc-500">{subtitle}</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-700">
          <Icon size={20} />
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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {title}
      </div>
      <div className="mt-1 text-xl font-bold text-zinc-950">{value}</div>
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
    <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-zinc-100 p-3">{icon}</div>
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

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [semPermissao, setSemPermissao] = useState(false);
  const [faseCarregamento, setFaseCarregamento] = useState(
    "Carregando resumo principal do salao."
  );
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [resumo, setResumo] = useState<DashboardResumo>(RESUMO_INICIAL);

  const loadSecondarySummary = useCallback(
    async (
      idSalao: string,
      inicioHojeIso: string,
      fimHojeIso: string,
      inicioMesIso: string,
      fimMesIso: string,
      commandasMesData: Array<{ id_cliente?: string | null; total?: number | null }>
    ) => {
      try {
        setSecondaryLoading(true);
        setFaseCarregamento("Carregando indicadores complementares.");

        const [
          comandasHojeRes,
          comissoesPendentesRes,
          profissionaisAtivosRes,
          aguardandoPagamentoRes,
          agendamentosCanceladosMesRes,
        ] = await Promise.all([
          supabase
            .from("comandas")
            .select("id, total")
            .eq("id_salao", idSalao)
            .eq("status", "fechada")
            .gte("fechada_em", inicioHojeIso)
            .lte("fechada_em", fimHojeIso),
          supabase
            .from("comissoes_lancamentos")
            .select("id, valor_comissao, status")
            .eq("id_salao", idSalao)
            .eq("status", "pendente")
            .gte("competencia_data", inicioMesIso.slice(0, 10))
            .lte("competencia_data", fimMesIso.slice(0, 10)),
          supabase
            .from("profissionais")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", idSalao)
            .eq("status", "ativo"),
          supabase
            .from("comandas")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", idSalao)
            .eq("status", "aguardando_pagamento"),
          supabase
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", idSalao)
            .eq("status", "cancelado")
            .gte("data", inicioMesIso.slice(0, 10))
            .lte("data", fimMesIso.slice(0, 10)),
        ]);

        if (comandasHojeRes.error) throw comandasHojeRes.error;
        if (comissoesPendentesRes.error) throw comissoesPendentesRes.error;
        if (profissionaisAtivosRes.error) throw profissionaisAtivosRes.error;
        if (aguardandoPagamentoRes.error) throw aguardandoPagamentoRes.error;
        if (agendamentosCanceladosMesRes.error) {
          throw agendamentosCanceladosMesRes.error;
        }

        const comissoesPendentes = comissoesPendentesRes.data || [];
        const caixaDia = (comandasHojeRes.data || []).reduce(
          (acc, item) => acc + Number(item.total || 0),
          0
        );
        const clientesUnicosMes = new Set(
          commandasMesData.map((item) => item.id_cliente).filter(Boolean)
        ).size;
        const retornoClientes =
          clientesUnicosMes > 0
            ? Math.min(
                Math.round((commandasMesData.length / clientesUnicosMes) * 100),
                100
              )
            : 0;

        setResumo((current) => ({
          ...current,
          caixaDia,
          retornoClientes,
          comissaoPendenteMes: comissoesPendentes.reduce(
            (acc, item) => acc + Number(item.valor_comissao || 0),
            0
          ),
          profissionaisAtivos: Number(profissionaisAtivosRes.count || 0),
          cancelamentosMes: Number(agendamentosCanceladosMesRes.count || 0),
          aguardandoPagamento: Number(aguardandoPagamentoRes.count || 0),
          notificacoesPendentes:
            Number(aguardandoPagamentoRes.count || 0) + current.proximosConfirmados,
        }));
        setUltimaAtualizacao(new Date().toISOString());
      } catch (error) {
        console.error("Erro ao carregar indicadores secundarios:", error);
      } finally {
        setSecondaryLoading(false);
        setFaseCarregamento("Resumo atualizado.");
      }
    },
    [supabase]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setSemPermissao(false);
      setResumo(RESUMO_INICIAL);
      setFaseCarregamento("Validando acesso ao painel.");

      const usuario = await getUsuarioLogado();

      if (!usuario?.idSalao) {
        throw new Error("Nao foi possivel identificar o salao do usuario.");
      }

      const nivelUsuario = (usuario?.perfil?.nivel ?? null) as
        | "admin"
        | "gerente"
        | "profissional"
        | "recepcao"
        | null;

      if (!hasPermission(nivelUsuario, "dashboard_ver")) {
        setSemPermissao(true);
        return;
      }

      const idSalao = usuario.idSalao;
      const agora = new Date();
      const inicioHoje = new Date(agora);
      inicioHoje.setHours(0, 0, 0, 0);
      const fimHoje = new Date(agora);
      fimHoje.setHours(23, 59, 59, 999);
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
      const fimMes = new Date(
        agora.getFullYear(),
        agora.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const daqui2Horas = new Date(agora.getTime() + 2 * 60 * 60 * 1000);

      setFaseCarregamento("Carregando indicadores principais.");

      const [
        agendamentosHojeRes,
        clientesRes,
        comandasMesRes,
        salaoRes,
        agendamentosConfirmadosHojeRes,
      ] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .gte("data", inicioHoje.toISOString().slice(0, 10))
          .lte("data", fimHoje.toISOString().slice(0, 10))
          .in("status", ["confirmado", "pendente", "atendido", "aguardando_pagamento"]),
        supabase
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao),
        supabase
          .from("comandas")
          .select("id, total, id_cliente")
          .eq("id_salao", idSalao)
          .eq("status", "fechada")
          .gte("fechada_em", inicioMes.toISOString())
          .lte("fechada_em", fimMes.toISOString()),
        supabase.from("saloes").select("id, plano").eq("id", idSalao).maybeSingle(),
        supabase
          .from("agendamentos")
          .select("id, data, hora_inicio")
          .eq("id_salao", idSalao)
          .eq("status", "confirmado")
          .eq("data", inicioHoje.toISOString().slice(0, 10)),
      ]);

      if (agendamentosHojeRes.error) throw agendamentosHojeRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (comandasMesRes.error) throw comandasMesRes.error;
      if (salaoRes.error) throw salaoRes.error;
      if (agendamentosConfirmadosHojeRes.error) {
        throw agendamentosConfirmadosHojeRes.error;
      }

      const comandasMes = comandasMesRes.data || [];
      const faturamentoMes = comandasMes.reduce(
        (acc, item) => acc + Number(item.total || 0),
        0
      );
      const servicosMes = comandasMes.length;
      const ticketMedioMes =
        comandasMes.length > 0 ? faturamentoMes / comandasMes.length : 0;
      const proximosConfirmados = (agendamentosConfirmadosHojeRes.data || []).filter(
        (item) => {
          if (!item.hora_inicio) return false;
          const dataHora = new Date(`${item.data}T${item.hora_inicio}`);
          return dataHora >= agora && dataHora <= daqui2Horas;
        }
      ).length;

      setResumo((current) => ({
        ...current,
        agendamentosHoje: Number(agendamentosHojeRes.count || 0),
        proximosConfirmados,
        clientesAtivos: Number(clientesRes.count || 0),
        servicosMes,
        faturamentoMes,
        ticketMedioMes,
        planoSalao: (salaoRes.data as SalaoInfo | null)?.plano || "-",
      }));
      setUltimaAtualizacao(new Date().toISOString());
      setLoading(false);

      void loadSecondarySummary(
        idSalao,
        inicioHoje.toISOString(),
        fimHoje.toISOString(),
        inicioMes.toISOString(),
        fimMes.toISOString(),
        comandasMes
      );
    } catch (error: unknown) {
      console.error(error);
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [loadSecondarySummary, supabase]);

  useEffect(() => {
    void init();
  }, [init]);

  const statusCaixa = useMemo(() => {
    if (secondaryLoading) return "Atualizando";
    return resumo.aguardandoPagamento > 0 ? "Com pendencias" : "Organizado";
  }, [resumo.aguardandoPagamento, secondaryLoading]);

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
      <div className="space-y-6">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-100 p-3">
              <ShieldAlert size={24} className="text-rose-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Acesso negado</h1>
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
    <div className="space-y-5">
      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Resumo do salao
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-zinc-950">
              Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              O painel abre primeiro com o essencial e termina o restante em
              segundo plano para voce entrar mais rapido no sistema.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            <InfoMetric
              title="Status do carregamento"
              value={secondaryLoading ? "Atualizando" : "Pronto"}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Visao geral
              </div>
              <div className="mt-1 text-xl font-bold text-zinc-950">
                Indicadores de operacao
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoMetric
              title="Ticket medio"
              value={formatCurrency(resumo.ticketMedioMes)}
              helper="Valor medio por comanda fechada"
            />
            <InfoMetric
              title="Comissao pendente"
              value={formatCurrency(resumo.comissaoPendenteMes)}
              helper={secondaryLoading ? "Atualizando..." : "Pronto para conferencia"}
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

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Status rapido
              </div>
              <div className="mt-1 text-xl font-bold text-zinc-950">
                Leitura do dia
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
              <Wallet size={18} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoMetric title="Caixa" value={statusCaixa} helper="Leitura operacional do recebimento" />
            <InfoMetric
              title="Profissionais"
              value={String(resumo.profissionaisAtivos)}
              helper={secondaryLoading ? "Atualizando..." : "Ativos no cadastro"}
            />
            <InfoMetric
              title="Aguardando pagamento"
              value={String(resumo.aguardandoPagamento)}
              helper="Comandas que pedem acao"
            />
            <InfoMetric
              title="Cancelamentos"
              value={String(resumo.cancelamentosMes)}
              helper="Ocorrencias no mes"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStatusCard
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
          title="Caixa do dia"
          value={formatCurrency(resumo.caixaDia)}
        />
        <MiniStatusCard
          icon={<CreditCard size={18} className="text-amber-600" />}
          title="Comissao pendente"
          value={formatCurrency(resumo.comissaoPendenteMes)}
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
