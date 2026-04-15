"use client";

import type { ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Lock,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ViewMode } from "@/types/agenda";

type Props = {
  currentDate: Date;
  viewMode: ViewMode;
  selectedProfessionalName: string;
  selectedProfessionalRole: string;
  appointmentsCount: number;
  waitingPaymentCount: number;
  blockedCount: number;
  potentialValue: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: ViewMode) => void;
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
  onPrev,
  onNext,
  onToday,
  onChangeView,
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
    <div className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 text-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Agenda premium
            </div>
            <div className="mt-1 text-2xl font-bold">Agenda</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
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

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Valor potencial
            </div>
            <div className="mt-1 text-xl font-bold">
              {currencyFormatter.format(potentialValue)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<CalendarDays size={16} />}
            label="Atendimentos"
            value={String(appointmentsCount)}
            tone="zinc"
          />
          <StatCard
            icon={<Sparkles size={16} />}
            label="Aguardando caixa"
            value={String(waitingPaymentCount)}
            tone="violet"
          />
          <StatCard
            icon={<Lock size={16} />}
            label="Bloqueios"
            value={String(blockedCount)}
            tone="amber"
          />
          <StatCard
            icon={<CalendarClock size={16} />}
            label="Mes atual"
            value={format(currentDate, "MMMM", { locale: ptBR })}
            tone="emerald"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={onToday}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Hoje
            </button>

            <button
              onClick={onNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              <ChevronRight size={16} />
            </button>

            <div className="ml-auto flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
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

          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isExpanded ? "Recolher agenda" : "Expandir agenda"}
          </button>

          <button
            onClick={onNewAppointment}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Novo agendamento
          </button>

          <button
            onClick={onNewBlock}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Bloquear horario
          </button>
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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "amber" | "emerald" | "violet" | "zinc";
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
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-lg font-bold capitalize">{value}</div>
      </div>
    </div>
  );
}
