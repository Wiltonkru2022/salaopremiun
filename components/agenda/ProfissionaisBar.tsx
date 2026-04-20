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
      className={`overflow-hidden rounded-[16px] border border-zinc-200 bg-white ${
        densityMode === "reception" ? "px-3 py-2" : "px-3 py-2.5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Equipe em foco
          </div>
        </div>

        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          {profissionais.length} profissional(is)
        </div>
      </div>

      <div className="mt-2 overflow-x-auto">
        <div
          className={`flex min-w-max pb-1 ${
            densityMode === "reception" ? "gap-2" : "gap-3"
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
                  `flex items-center gap-3 rounded-[16px] border text-left transition ${
                    densityMode === "reception"
                      ? "min-w-[150px] px-2.5 py-2"
                      : "min-w-[180px] px-3 py-2.5 xl:min-w-[210px]"
                  }`,
                  active
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                <img
                  src={prof.foto_url || "https://placehold.co/96x96?text=Prof"}
                  alt={prof.nome}
                  className={`${
                    densityMode === "reception" ? "h-8 w-8" : "h-10 w-10"
                  } rounded-full object-cover`}
                />

                <div className="min-w-0 flex-1">
                  <div
                    className={clsx(
                      `${
                        densityMode === "reception" ? "text-[10px]" : "text-[11px]"
                      } uppercase tracking-[0.14em]`,
                      active ? "text-zinc-400" : "text-zinc-500"
                    )}
                  >
                    {subtitle}
                  </div>
                  <div
                    className={`mt-0.5 truncate ${
                      densityMode === "reception" ? "text-xs" : "text-[13px] xl:text-sm"
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
