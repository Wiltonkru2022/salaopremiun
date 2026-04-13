"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ViewMode } from "@/types/agenda";

type Props = {
  currentDate: Date;
  viewMode: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: ViewMode) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onNewAppointment: () => void;
  onNewBlock: () => void;
};

export default function AgendaToolbar({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  isExpanded,
  onToggleExpanded,
  onNewAppointment,
  onNewBlock,
}: Props) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onPrev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={onToday}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Hoje
          </button>

          <button
            onClick={onNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
          >
            <ChevronRight size={16} />
          </button>

          <div className="ml-1 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
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

        <div className="text-center">
          <div className="text-[28px] font-bold leading-none text-zinc-900">Agenda</div>
          <div className="mt-1 text-sm capitalize text-zinc-500">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isExpanded ? "Recolher agenda" : "Expandir agenda"}
          </button>

          <button
            onClick={onNewAppointment}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95"
          >
            Novo agendamento
          </button>

          <button
            onClick={onNewBlock}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Bloquear horário
          </button>
        </div>
      </div>
    </div>
  );
}