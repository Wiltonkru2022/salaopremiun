"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { hasPermission } from "@/lib/auth/permissions";
import {
  CalendarDays,
  DollarSign,
  Scissors,
  Users,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  UserCheck,
  ShieldAlert,
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

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Card({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: IconType;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-500">{title}</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">{value}</div>
          <div className="mt-2 text-sm text-zinc-500">{subtitle}</div>
        </div>

        <div className="rounded-2xl bg-zinc-100 p-3">
          <Icon size={22} className="text-zinc-800" />
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-5">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-900">{value}</div>
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
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-zinc-100 p-3">{icon}</div>
        <div>
          <div className="text-sm text-zinc-500">{title}</div>
          <div className="mt-1 text-xl font-bold text-zinc-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [semPermissao, setSemPermissao] = useState(false);

  const [resumo, setResumo] = useState<DashboardResumo>({
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
  });

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setSemPermissao(false);

      const usuario = await getUsuarioLogado();

      if (!usuario?.idSalao) {
        throw new Error("Não foi possível identificar o salão do usuário.");
      }

const nivelUsuario = (usuario?.perfil?.nivel ?? null) as
  | "admin"
  | "gerente"
  | "profissional"
  | "recepcao"
  | null;

if (!hasPermission(nivelUsuario, "dashboard_ver")) {
  setSemPermissao(true);
  setLoading(false);
  return;
}

      const idSalao = usuario.idSalao;
      const agora = new Date();

      const inicioHoje = new Date(agora);
      inicioHoje.setHours(0, 0, 0, 0);

      const fimHoje = new Date(agora);
      fimHoje.setHours(23, 59, 59, 999);

      const inicioMes = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1,
        0,
        0,
        0,
        0
      );

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

      const [
        agendamentosHojeRes,
        clientesRes,
        comandasMesRes,
        comandasHojeRes,
        comissoesPendentesRes,
        profissionaisAtivosRes,
        aguardandoPagamentoRes,
        salaoRes,
        agendamentosConfirmadosHojeRes,
        agendamentosCanceladosMesRes,
      ] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .gte("data", inicioHoje.toISOString().slice(0, 10))
          .lte("data", fimHoje.toISOString().slice(0, 10))
          .in("status", [
            "confirmado",
            "pendente",
            "atendido",
            "aguardando_pagamento",
          ]),

        supabase
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao),

        supabase
          .from("comandas")
          .select("id, total, id_cliente, fechada_em, status")
          .eq("id_salao", idSalao)
          .eq("status", "fechada")
          .gte("fechada_em", inicioMes.toISOString())
          .lte("fechada_em", fimMes.toISOString()),

        supabase
          .from("comandas")
          .select("id, total")
          .eq("id_salao", idSalao)
          .eq("status", "fechada")
          .gte("fechada_em", inicioHoje.toISOString())
          .lte("fechada_em", fimHoje.toISOString()),

        supabase
          .from("comissoes_lancamentos")
          .select("id, valor_comissao, status")
          .eq("id_salao", idSalao)
          .eq("status", "pendente")
          .gte("competencia_data", inicioMes.toISOString().slice(0, 10))
          .lte("competencia_data", fimMes.toISOString().slice(0, 10)),

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
          .from("saloes")
          .select("id, plano")
          .eq("id", idSalao)
          .maybeSingle(),

        supabase
          .from("agendamentos")
          .select("id, data, hora_inicio, status")
          .eq("id_salao", idSalao)
          .eq("status", "confirmado")
          .eq("data", inicioHoje.toISOString().slice(0, 10)),

        supabase
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", idSalao)
          .eq("status", "cancelado")
          .gte("data", inicioMes.toISOString().slice(0, 10))
          .lte("data", fimMes.toISOString().slice(0, 10)),
      ]);

      if (agendamentosHojeRes.error) throw agendamentosHojeRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (comandasMesRes.error) throw comandasMesRes.error;
      if (comandasHojeRes.error) throw comandasHojeRes.error;
      if (comissoesPendentesRes.error) throw comissoesPendentesRes.error;
      if (profissionaisAtivosRes.error) throw profissionaisAtivosRes.error;
      if (aguardandoPagamentoRes.error) throw aguardandoPagamentoRes.error;
      if (salaoRes.error) throw salaoRes.error;
      if (agendamentosConfirmadosHojeRes.error) throw agendamentosConfirmadosHojeRes.error;
      if (agendamentosCanceladosMesRes.error) throw agendamentosCanceladosMesRes.error;

      const comandasMes = comandasMesRes.data || [];
      const comandasHoje = comandasHojeRes.data || [];
      const comissoesPendentes = comissoesPendentesRes.data || [];
      const agendamentosConfirmadosHoje = agendamentosConfirmadosHojeRes.data || [];

      const faturamentoMes = comandasMes.reduce(
        (acc, item) => acc + Number(item.total || 0),
        0
      );

      const caixaDia = comandasHoje.reduce(
        (acc, item) => acc + Number(item.total || 0),
        0
      );

      const servicosMes = comandasMes.length;

      const ticketMedioMes =
        comandasMes.length > 0 ? faturamentoMes / comandasMes.length : 0;

      const comissaoPendenteMes = comissoesPendentes.reduce(
        (acc, item) => acc + Number(item.valor_comissao || 0),
        0
      );

      const clientesUnicosMes = new Set(
        comandasMes.map((item) => item.id_cliente).filter(Boolean)
      ).size;

      const retornoClientes =
        clientesUnicosMes > 0
          ? Math.min(
              Math.round((comandasMes.length / clientesUnicosMes) * 100),
              100
            )
          : 0;

      const cancelamentosMes = Number(agendamentosCanceladosMesRes.count || 0);

      const proximosConfirmados = agendamentosConfirmadosHoje.filter((item) => {
        if (!item.hora_inicio) return false;

        const dataHora = new Date(`${item.data}T${item.hora_inicio}`);
        return dataHora >= agora && dataHora <= daqui2Horas;
      }).length;

      const notificacoesPendentes =
        Number(aguardandoPagamentoRes.count || 0) + Number(proximosConfirmados || 0);

      setResumo({
        agendamentosHoje: Number(agendamentosHojeRes.count || 0),
        proximosConfirmados,
        clientesAtivos: Number(clientesRes.count || 0),
        servicosMes,
        faturamentoMes,
        ticketMedioMes,
        comissaoPendenteMes,
        caixaDia,
        retornoClientes,
        profissionaisAtivos: Number(profissionaisAtivosRes.count || 0),
        cancelamentosMes,
        aguardandoPagamento: Number(aguardandoPagamentoRes.count || 0),
        planoSalao: (salaoRes.data as SalaoInfo | null)?.plano || "-",
        notificacoesPendentes,
      });
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
    return resumo.aguardandoPagamento > 0 ? "Com pendências" : "Organizado";
  }, [resumo.aguardandoPagamento]);

  if (loading) {
    return <div className="p-6">Carregando dashboard...</div>;
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
              <h1 className="text-2xl font-bold text-zinc-900">
                Acesso negado
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Você não tem permissão para visualizar o dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Agendamentos hoje"
          value={String(resumo.agendamentosHoje)}
          icon={CalendarDays}
          subtitle={`${resumo.proximosConfirmados} confirmados nas próximas 2 horas`}
        />
        <Card
          title="Clientes ativos"
          value={String(resumo.clientesAtivos)}
          icon={Users}
          subtitle="Base ativa do salão"
        />
        <Card
          title="Serviços do mês"
          value={String(resumo.servicosMes)}
          icon={Scissors}
          subtitle="Comandas fechadas no período"
        />
        <Card
          title="Faturamento"
          value={formatCurrency(resumo.faturamentoMes)}
          icon={DollarSign}
          subtitle="Resultado real do mês"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Visão geral do negócio
              </h2>
              <p className="text-sm text-zinc-500">
                Resumo operacional real do salão
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-3">
              <TrendingUp size={20} className="text-zinc-800" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <QuickCard
              title="Ticket médio"
              value={formatCurrency(resumo.ticketMedioMes)}
            />
            <QuickCard
              title="Comissão pendente"
              value={formatCurrency(resumo.comissaoPendenteMes)}
            />
            <QuickCard
              title="Caixa do dia"
              value={formatCurrency(resumo.caixaDia)}
            />
            <QuickCard
              title="Retorno de clientes"
              value={`${resumo.retornoClientes}%`}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Status rápido
              </h2>
              <p className="text-sm text-zinc-500">Indicadores do dia</p>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-3">
              <Wallet size={20} className="text-zinc-800" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm text-zinc-500">Caixa</div>
              <div className="mt-1 font-semibold text-zinc-900">
                {statusCaixa}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm text-zinc-500">Plano</div>
              <div className="mt-1 font-semibold uppercase text-zinc-900">
                {resumo.planoSalao}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm text-zinc-500">Notificações</div>
              <div className="mt-1 font-semibold text-zinc-900">
                {resumo.notificacoesPendentes} pendentes
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm text-zinc-500">Profissionais ativos</div>
              <div className="mt-1 font-semibold text-zinc-900">
                {resumo.profissionaisAtivos} ativos
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm text-zinc-500">Aguardando pagamento</div>
              <div className="mt-1 font-semibold text-zinc-900">
                {resumo.aguardandoPagamento}
              </div>
            </div>
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
          title="Comissão pendente"
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