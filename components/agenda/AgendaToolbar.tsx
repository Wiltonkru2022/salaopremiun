"use client";

import type { ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns2,
  Lock,
  Maximize2,
  Minimize2,
  MonitorUp,
} from "lucide-react";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendaDensityMode, ViewMode } from "@/types/agenda";

type Props = {
  currentDate: Date;
  viewMode: ViewMode;
  selectedProfessionalName: string;
  selectedProfessionalRole: string;
  appointmentsCount: number;
  waitingPaymentCount: number;
  blockedCount: number;
  potentialValue: number;
  statusCounts: {
    confirmado: number;
    pendente: number;
    atendido: number;
    aguardandoPagamento: number;
    cancelado: number;
  };
  densityMode: AgendaDensityMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: ViewMode) => void;
  onChangeDensityMode: (mode: AgendaDensityMode) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onNewAppointment: () => void;
  onNewBlock: () => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function AgendaToolbar({
  currentDate,
  viewMode,
  selectedProfessionalName,
  selectedProfessionalRole,
  appointmentsCount,
  waitingPaymentCount,
  blockedCount,
  potentialValue,
  statusCounts,
  densityMode,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onChangeDensityMode,
  isExpanded,
  onToggleExpanded,
  onNewAppointment,
  onNewBlock,
}: Props) {
  const periodLabel =
    viewMode === "day"
      ? format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
      : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd MMM", {
          locale: ptBR,
        })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "dd MMM", {
          locale: ptBR,
        })}`;

  return (
    <div className="overflow-hidden rounded-[16px] border border-zinc-200 bg-white">
      <div
        className={`border-b border-zinc-200 bg-white text-zinc-950 ${
          densityMode === "reception" ? "px-3 py-2" : "px-3 py-3 lg:px-4"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div
              className={`font-semibold uppercase tracking-[0.22em] text-zinc-500 ${
                densityMode === "reception" ? "text-[10px]" : "text-xs"
              }`}
            >
              Operacao da agenda
            </div>
            <div
              className={`mt-1 font-bold ${
                densityMode === "reception" ? "text-base md:text-lg" : "text-xl md:text-2xl"
              }`}
            >
              Agenda
            </div>
            <div
              className={`flex flex-wrap items-center gap-2 text-zinc-600 ${
                densityMode === "reception" ? "mt-1 text-[11px]" : "mt-1.5 text-xs"
              }`}
            >
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 capitalize">
                {periodLabel}
              </span>
              {selectedProfessionalName ? (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                  {selectedProfessionalName}
                  {selectedProfessionalRole ? ` - ${selectedProfessionalRole}` : ""}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className={`rounded-xl border border-zinc-200 bg-zinc-50 ${
              densityMode === "reception" ? "px-3 py-1.5" : "px-3 py-2"
            }`}
          >
            <div
              className={`uppercase tracking-[0.18em] text-zinc-500 ${
                densityMode === "reception" ? "text-[10px]" : "text-xs"
              }`}
            >
              Valor potencial
            </div>
            <div className="mt-1 text-base font-bold md:text-lg">
              {currencyFormatter.format(potentialValue)}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center ${
          densityMode === "reception" ? "px-3 py-2" : "px-3 py-3 lg:px-4"
        }`}
      >
        <div
          className={`grid sm:grid-cols-2 xl:grid-cols-4 ${
            densityMode === "reception" ? "gap-2" : "gap-2.5"
          }`}
        >
          <StatCard
            icon={<CalendarDays size={16} />}
            label="Atendimentos"
            value={String(appointmentsCount)}
            tone="zinc"
            compact={densityMode === "reception"}
          />
          <StatCard
            icon={<MonitorUp size={16} />}
            label="Aguardando caixa"
            value={String(waitingPaymentCount)}
            tone="violet"
            compact={densityMode === "reception"}
          />
          <StatCard
            icon={<Lock size={16} />}
            label="Bloqueios"
            value={String(blockedCount)}
            tone="amber"
            compact={densityMode === "reception"}
          />
          <StatCard
            icon={<CalendarClock size={16} />}
            label="Mes atual"
            value={format(currentDate, "MMMM", { locale: ptBR })}
            tone="emerald"
            compact={densityMode === "reception"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={onPrev}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={onToday}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Hoje
            </button>

            <button
              onClick={onNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              <ChevronRight size={16} />
            </button>

            <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              <button
                onClick={() => onChangeView("day")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "day" ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                <CalendarDays size={14} />
                Dia
              </button>

              <button
                onClick={() => onChangeView("week")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "week" ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                <Columns2 size={14} />
                Semana
              </button>
            </div>
          </div>

          <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => onChangeDensityMode("reception")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                densityMode === "reception"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600"
              }`}
            >
              <ChevronsUpDown size={14} />
              Recepcao
            </button>
            <button
              type="button"
              onClick={() => onChangeDensityMode("standard")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                densityMode === "standard"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600"
              }`}
            >
              <Columns2 size={14} />
              Conforto
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden lg:inline">
              {isExpanded ? "Recolher agenda" : "Expandir agenda"}
            </span>
          </button>

          <button
            onClick={onNewAppointment}
            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Novo agendamento
          </button>

          <button
            onClick={onNewBlock}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Bloquear horario
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 xl:col-span-2">
          <StatusPill
            label="Confirmados"
            value={statusCounts.confirmado}
            tone="emerald"
          />
          <StatusPill
            label="Pendentes"
            value={statusCounts.pendente}
            tone="amber"
          />
          <StatusPill
            label="Em caixa"
            value={statusCounts.aguardandoPagamento}
            tone="violet"
          />
          <StatusPill
            label="Atendidos"
            value={statusCounts.atendido}
            tone="sky"
          />
          {statusCounts.cancelado > 0 ? (
            <StatusPill
              label="Cancelados"
              value={statusCounts.cancelado}
              tone="rose"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "amber" | "emerald" | "violet" | "zinc";
  compact?: boolean;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-900"
      : "border-zinc-200 bg-zinc-50 text-zinc-900";

  return (
    <div className={`rounded-xl border ${compact ? "px-3 py-2" : "px-3 py-2.5"} ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`${compact ? "text-sm" : "text-base md:text-lg"} font-bold capitalize`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "violet" | "sky" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "violet"
          ? "border-violet-200 bg-violet-50 text-violet-800"
          : tone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-800"
            : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold">
        {value}
      </span>
    </div>
  );
}
