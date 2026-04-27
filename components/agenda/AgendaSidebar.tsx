"use client";

import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  Eye,
  Lock,
  MonitorUp,
  PanelRightOpen,
  Sparkles,
  UserRoundSearch,
  Wallet,
  X,
} from "lucide-react";
import type { AgendaDensityMode, ViewMode } from "@/types/agenda";

type Props = {
  open: boolean;
  currentMonthLabel: string;
  potentialValueLabel: string;
  potentialValueVisible: boolean;
  potentialGoalLabel: string;
  potentialProgress: number;
  appointmentsCount: number;
  waitingPaymentCount: number;
  blockedCount: number;
  attendedCount: number;
  statusCounts: {
    confirmado: number;
    pendente: number;
    atendido: number;
    aguardandoPagamento: number;
    cancelado: number;
  };
  viewMode: ViewMode;
  densityMode: AgendaDensityMode;
  onToggleOpen: () => void;
  onChangeView: (view: ViewMode) => void;
  onChangeDensityMode: (mode: AgendaDensityMode) => void;
  onToday: () => void;
  onTogglePotentialValueVisible: () => void;
  onOpenCreate: () => void;
  onOpenBlock: () => void;
  onOpenCredit: () => void;
  onOpenCashier: () => void;
};

export default function AgendaSidebar(props: Props) {
  const {
    open,
    currentMonthLabel,
    potentialValueLabel,
    potentialValueVisible,
    potentialGoalLabel,
    potentialProgress,
    appointmentsCount,
    waitingPaymentCount,
    blockedCount,
    attendedCount,
    statusCounts,
    viewMode,
    densityMode,
    onToggleOpen,
    onChangeView,
    onChangeDensityMode,
    onToday,
    onTogglePotentialValueVisible,
    onOpenCreate,
    onOpenBlock,
    onOpenCredit,
    onOpenCashier,
  } = props;

  if (!open) {
    return (
      <div className="hidden lg:flex lg:h-full lg:items-start">
        <button
          type="button"
          onClick={onToggleOpen}
          className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-zinc-700 shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
          title="Abrir painel da agenda"
        >
          <PanelRightOpen size={18} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full min-h-0 lg:h-full lg:max-w-[292px] lg:min-w-[292px]">
      <div className="flex h-full min-h-0 flex-col rounded-[30px] border border-white/80 bg-white/96 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.06em] text-slate-900">
              Agenda
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Visao geral do periodo</p>
          </div>

          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:text-zinc-900"
            title="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="agenda-scroll mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-950">Valor potencial</p>
                <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-emerald-600">
                  {potentialValueVisible ? potentialValueLabel : "R$ ******"}
                </p>
              </div>
              <button
                type="button"
                onClick={onTogglePotentialValueVisible}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50/80 text-zinc-600"
                title={potentialValueVisible ? "Ocultar valor" : "Mostrar valor"}
              >
                <Eye size={18} />
              </button>
            </div>

            <div className="mt-4 h-2 rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${Math.max(8, Math.min(potentialProgress, 100))}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-zinc-500">
              <span>{potentialGoalLabel}</span>
              <span>{Math.round(potentialProgress)}%</span>
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-[1.55rem] font-semibold tracking-[-0.05em] text-slate-900 capitalize">
                {currentMonthLabel}
              </span>
              <ChevronDown size={18} className="text-zinc-500" />
            </button>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <MetricCard
                icon={<UserRoundSearch size={16} />}
                label="Atendimentos"
                value={appointmentsCount}
                tone="emerald"
              />
              <MetricCard
                icon={<Wallet size={16} />}
                label="Aguardando caixa"
                value={waitingPaymentCount}
                tone="amber"
              />
              <MetricCard
                icon={<Lock size={16} />}
                label="Bloqueios"
                value={blockedCount}
                tone="violet"
              />
              <MetricCard
                icon={<CalendarDays size={16} />}
                label="Atendidos"
                value={attendedCount}
                tone="sky"
              />
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em] text-slate-900">
              Status dos atendimentos
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <StatusCard label="Confirmados" value={statusCounts.confirmado} tone="emerald" />
              <StatusCard label="Pendentes" value={statusCounts.pendente} tone="amber" />
              <StatusCard
                label="Em caixa"
                value={statusCounts.aguardandoPagamento}
                tone="violet"
              />
              <StatusCard label="Atendidos" value={statusCounts.atendido} tone="sky" />
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em] text-slate-900">
              Visualizacao
            </h3>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ToggleButton active={false} onClick={onToday}>
                Hoje
              </ToggleButton>
              <ToggleButton active={viewMode === "day"} onClick={() => onChangeView("day")}>
                Dia
              </ToggleButton>
              <ToggleButton active={viewMode === "week"} onClick={() => onChangeView("week")}>
                Semana
              </ToggleButton>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <ModeButton
                active={densityMode === "reception"}
                label="Recepcao"
                icon={<Sparkles size={17} />}
                onClick={() => onChangeDensityMode("reception")}
              />
              <ModeButton
                active={densityMode === "standard"}
                label="Conforto"
                icon={<MonitorUp size={17} />}
                onClick={() => onChangeDensityMode("standard")}
              />
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em] text-slate-900">
              Acoes rapidas
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <QuickAction
                icon={<CalendarDays size={16} />}
                label="Novo agendamento"
                onClick={onOpenCreate}
              />
              <QuickAction
                icon={<Lock size={16} />}
                label="Bloquear horario"
                onClick={onOpenBlock}
              />
              <QuickAction
                icon={<CreditCard size={16} />}
                label="Abrir credito"
                onClick={onOpenCredit}
              />
              <QuickAction
                icon={<Wallet size={16} />}
                label="Ver caixas"
                onClick={onOpenCashier}
              />
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "amber" | "violet" | "sky";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "violet"
          ? "bg-violet-50 text-violet-700"
          : "bg-sky-50 text-sky-700";

  return (
    <div className="rounded-[18px] border border-zinc-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses}`}>
          {icon}
        </div>
        <div>
          <div className="text-[13px] text-zinc-600">{label}</div>
          <div className="mt-1 text-[1.55rem] font-semibold tracking-[-0.05em] text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "violet" | "sky";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "violet"
          ? "bg-violet-50 text-violet-700"
          : "bg-sky-50 text-sky-700";

  return (
    <div className={`rounded-[18px] px-4 py-3 ${toneClasses}`}>
      <div className="text-[13px] font-medium">{label}</div>
      <div className="mt-1 text-[1.45rem] font-semibold tracking-[-0.05em]">{value}</div>
    </div>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl bg-violet-600 px-3 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)]"
          : "rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-700"
      }
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center justify-center gap-2 rounded-[20px] border border-violet-300 bg-violet-50 px-4 py-4 text-sm font-semibold text-violet-700 shadow-[0_12px_30px_rgba(124,58,237,0.12)]"
          : "flex items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-4 py-4 text-sm font-medium text-zinc-700"
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-4 py-4 text-left text-sm font-medium text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:-translate-y-[1px] hover:shadow-[0_16px_35px_rgba(15,23,42,0.08)]"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
        {icon}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}
