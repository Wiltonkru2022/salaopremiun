"use client";

import clsx from "clsx";
import { Profissional } from "@/types/agenda";

type Props = {
  profissionais: Profissional[];
  selectedProfissionalId: string;
  onSelect: (id: string) => void;
};

export default function ProfissionaisBar({
  profissionais,
  selectedProfissionalId,
  onSelect,
}: Props) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Equipe em foco
          </div>
          <div className="mt-1 text-lg font-bold text-zinc-950">
            Profissionais da agenda
          </div>
        </div>

        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          {profissionais.length} profissional(is)
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-max gap-3 pb-1">
          {profissionais.map((prof) => {
            const active = selectedProfissionalId === prof.id;
            const subtitle = prof.cargo || prof.categoria || "Agenda ativa";

            return (
              <button
                key={prof.id}
                onClick={() => onSelect(prof.id)}
                className={clsx(
                  "flex min-w-[230px] items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition",
                  active
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                <img
                  src={prof.foto_url || "https://placehold.co/96x96?text=Prof"}
                  alt={prof.nome}
                  className="h-12 w-12 rounded-full object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div
                    className={clsx(
                      "text-[11px] uppercase tracking-[0.14em]",
                      active ? "text-zinc-400" : "text-zinc-500"
                    )}
                  >
                    {subtitle}
                  </div>
                  <div className="mt-1 truncate text-base font-bold leading-tight">
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
