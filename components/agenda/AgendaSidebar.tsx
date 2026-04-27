"use client";

import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  Eye,
  Lock,
  Maximize2,
  Minimize2,
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
  isExpanded: boolean;
  onToggleOpen: () => void;
  onChangeView: (view: ViewMode) => void;
  onChangeDensityMode: (mode: AgendaDensityMode) => void;
  onToggleExpanded: () => void;
  onToday: () => void;
  onOpenFullscreen: () => void;
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
    potentialGoalLabel,
    potentialProgress,
    appointmentsCount,
    waitingPaymentCount,
    blockedCount,
    attendedCount,
    statusCounts,
    viewMode,
    densityMode,
    isExpanded,
    onToggleOpen,
    onChangeView,
    onChangeDensityMode,
    onToggleExpanded,
    onToday,
    onOpenFullscreen,
    onOpenCreate,
    onOpenBlock,
    onOpenCredit,
    onOpenCashier,
  } = props;

  if (!open) {
    return (
      <div className="hidden lg:flex lg:items-start">
        <button
          type="button"
          onClick={onToggleOpen}
          className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-zinc-700 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur"
          title="Abrir painel da agenda"
        >
          <PanelRightOpen size={18} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full lg:max-w-[302px] lg:min-w-[302px] xl:max-w-[314px] xl:min-w-[314px]">
      <div className="rounded-[30px] border border-white/80 bg-white/94 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.13)] backdrop-blur xl:p-[18px]">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpenFullscreen}
            className="text-left"
            title="Abrir agenda em tela cheia"
          >
            <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900">
              Agenda
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Visao geral do periodo</p>
          </button>

          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:text-zinc-900"
            title="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-950">Valor potencial</p>
                <p className="mt-2 text-[1.95rem] font-semibold tracking-[-0.05em] text-emerald-600">
                  {potentialValueLabel}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50/80 text-zinc-600">
                <Eye size={18} />
              </div>
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

          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-[1.7rem] font-semibold tracking-[-0.05em] text-slate-900">
                {currentMonthLabel}
              </span>
              <ChevronDown size={18} className="text-zinc-500" />
            </button>

            <div className="mt-4 grid grid-cols-2 gap-2">
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

          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-900">
              Status dos atendimentos
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2">
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

          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-900">
              Visualizacao
            </h3>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ToggleButton active={false} onClick={onToday}>
                Hoje
              </ToggleButton>
              <ToggleButton
                active={viewMode === "day"}
                onClick={() => onChangeView("day")}
              >
                Dia
              </ToggleButton>
              <ToggleButton
                active={viewMode === "week"}
                onClick={() => onChangeView("week")}
              >
                Semana
              </ToggleButton>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
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

          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-900">
              Acoes rapidas
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2">
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
              <QuickAction
                icon={isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                label={isExpanded ? "Recolher agenda" : "Expandir agenda"}
                onClick={onToggleExpanded}
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
    <div className="rounded-[18px] border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses}`}>
          {icon}
        </div>
        <div>
          <div className="text-[13px] text-zinc-600">{label}</div>
          <div className="mt-1 text-[1.65rem] font-semibold tracking-[-0.05em] text-slate-900">
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
    <div className={`rounded-[18px] px-4 py-2.5 ${toneClasses}`}>
      <div className="text-[13px] font-medium">{label}</div>
      <div className="mt-1 text-[1.55rem] font-semibold tracking-[-0.05em]">
        {value}
      </div>
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
          ? "rounded-2xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)]"
          : "rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700"
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
          ? "flex items-center justify-center gap-2 rounded-[20px] border border-violet-300 bg-violet-50 px-4 py-3.5 text-sm font-semibold text-violet-700 shadow-[0_12px_30px_rgba(124,58,237,0.12)]"
          : "flex items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-4 py-3.5 text-sm font-medium text-zinc-700"
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
      className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-4 py-3.5 text-left text-sm font-medium text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:-translate-y-[1px] hover:shadow-[0_16px_35px_rgba(15,23,42,0.08)]"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
        {icon}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}
