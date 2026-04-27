"use client";

import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  SlidersHorizontal,
} from "lucide-react";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ViewMode } from "@/types/agenda";

type Props = {
  currentDate: Date;
  viewMode: ViewMode;
  selectedProfessionalName: string;
  selectedProfessionalRole: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: ViewMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function AgendaToolbar({
  currentDate,
  viewMode,
  selectedProfessionalName,
  selectedProfessionalRole,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const periodLabel =
    viewMode === "day"
      ? format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
      : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd", {
          locale: ptBR,
        })} - ${format(
          endOfWeek(currentDate, { weekStartsOn: 1 }),
          "dd 'de' MMMM 'de' yyyy",
          {
            locale: ptBR,
          }
        )}`;

  return (
    <div className="rounded-[30px] border border-white/75 bg-white/92 px-4 py-4 shadow-[0_22px_65px_rgba(15,23,42,0.10)] backdrop-blur lg:px-6 lg:py-[18px]">
      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="min-w-0 pr-1">
            <div className="text-[1.95rem] font-semibold tracking-[-0.06em] text-slate-900">
              Agenda
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              {selectedProfessionalName ? (
                <span className="rounded-full border border-zinc-200/80 bg-zinc-50/80 px-3 py-1 text-[13px] text-zinc-700">
                  {selectedProfessionalName}
                  {selectedProfessionalRole ? ` - ${selectedProfessionalRole}` : ""}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onToday}
            className="hidden h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50 md:inline-flex md:items-center"
          >
            Hoje
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={onPrev}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <div className="rounded-2xl bg-white px-1 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-zinc-200">
            <button
              onClick={() => onChangeView("day")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                viewMode === "day"
                  ? "bg-violet-600 text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
                  : "text-zinc-600"
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => onChangeView("week")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                viewMode === "week"
                  ? "bg-violet-600 text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
                  : "text-zinc-600"
              }`}
            >
              Semana
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
            title={sidebarOpen ? "Ocultar painel" : "Abrir painel"}
          >
            {sidebarOpen ? (
              <SlidersHorizontal size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <CalendarClock size={16} />
          <span className="capitalize">{periodLabel}</span>
          <ChevronDown size={14} className="text-zinc-400" />
        </div>

        <button
          type="button"
          onClick={onToday}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50 md:hidden"
        >
          Hoje
        </button>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onPrev}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
