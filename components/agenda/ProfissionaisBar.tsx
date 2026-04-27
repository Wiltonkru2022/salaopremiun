"use client";

import clsx from "clsx";
import { AgendaDensityMode, Profissional } from "@/types/agenda";

type Props = {
  profissionais: Profissional[];
  selectedProfissionalId: string;
  densityMode: AgendaDensityMode;
  onSelect: (id: string) => void;
};

export default function ProfissionaisBar({
  profissionais,
  selectedProfissionalId,
  densityMode,
  onSelect,
}: Props) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-white/75 bg-white/92 shadow-[0_18px_52px_rgba(15,23,42,0.09)] backdrop-blur ${
        densityMode === "reception" ? "px-4 py-2.5" : "px-4 py-3"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="text-[14px] font-semibold tracking-[-0.02em] text-slate-900">
            Equipe em foco
          </div>
        </div>

        <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          {profissionais.length} profissional(is)
        </div>
      </div>

      <div className={densityMode === "reception" ? "mt-1 overflow-x-auto" : "mt-1.5 overflow-x-auto"}>
        <div
          className={`flex min-w-max pb-1 ${
            densityMode === "reception" ? "gap-2" : "gap-2.5"
          }`}
        >
          {profissionais.map((prof) => {
            const active = selectedProfissionalId === prof.id;
            const subtitle = prof.cargo || prof.categoria || "Agenda ativa";

            return (
              <button
                key={prof.id}
                onClick={() => onSelect(prof.id)}
                className={clsx(
                  `flex items-center gap-3 rounded-[24px] border text-left shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition ${
                    densityMode === "reception"
                      ? "min-w-[136px] px-2.5 py-2"
                      : "min-w-[168px] px-3 py-2.5 xl:min-w-[188px]"
                  }`,
                  active
                    ? "border-violet-400 bg-white text-zinc-900 shadow-[0_14px_34px_rgba(124,58,237,0.14)]"
                    : "border-zinc-200 bg-white/95 text-zinc-800 hover:border-zinc-300 hover:bg-white"
                )}
              >
                {prof.foto_url ? (
                  <img
                    src={prof.foto_url}
                    alt={prof.nome}
                    className={`${
                      densityMode === "reception" ? "h-7 w-7" : "h-9 w-9"
                    } rounded-full object-cover`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`${
                      densityMode === "reception" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-sm"
                    } flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-700`}
                  >
                    {prof.nome?.trim()?.charAt(0)?.toUpperCase() || "P"}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div
                    className={clsx(
                      `${
                      densityMode === "reception" ? "text-[10px]" : "text-[10px]"
                    } uppercase tracking-[0.14em]`,
                      active ? "text-violet-500" : "text-zinc-400"
                    )}
                  >
                    {subtitle}
                  </div>
                  <div
                    className={`mt-0.5 truncate ${
                      densityMode === "reception" ? "text-[11px]" : "text-[12px] xl:text-[13px]"
                    } font-bold leading-tight`}
                  >
                    {prof.nome}
                  </div>
                </div>

                <span
                  className={clsx(
                    "h-2.5 w-2.5 rounded-full",
                    active ? "bg-emerald-400" : "bg-zinc-300"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
