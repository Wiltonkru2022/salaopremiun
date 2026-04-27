"use client";

import {
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
      ? format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd", {
          locale: ptBR,
        })} - ${format(
          endOfWeek(currentDate, { weekStartsOn: 1 }),
          "dd 'de' MMMM 'de' yyyy",
          { locale: ptBR }
        )}`;

  return (
    <div className="rounded-[32px] border border-white/80 bg-white/96 px-5 py-5 shadow-[0_22px_65px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[2.15rem] font-semibold tracking-[-0.07em] text-slate-900">
              Agenda
            </h1>

            <button
              type="button"
              onClick={onToday}
              className="inline-flex h-11 items-center rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={onPrev}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-zinc-50"
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-transparent bg-transparent px-2 text-[1.05rem] font-medium text-zinc-800"
            >
              <span className="capitalize">{periodLabel}</span>
              <ChevronDown size={16} className="text-zinc-400" />
            </button>
          </div>

          {(selectedProfessionalName || selectedProfessionalRole) && (
            <div className="mt-3">
              <span className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-700 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                {selectedProfessionalName}
                {selectedProfessionalRole ? ` - ${selectedProfessionalRole}` : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-[20px] border border-zinc-200 bg-white p-1 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <button
              type="button"
              onClick={() => onChangeView("day")}
              className={`rounded-[16px] px-5 py-2.5 text-sm font-semibold ${
                viewMode === "day"
                  ? "bg-violet-600 text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
                  : "text-zinc-700"
              }`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => onChangeView("week")}
              className={`rounded-[16px] px-5 py-2.5 text-sm font-semibold ${
                viewMode === "week"
                  ? "bg-violet-600 text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
                  : "text-zinc-700"
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
            {sidebarOpen ? <SlidersHorizontal size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
