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
    <div className="overflow-x-auto rounded-[22px] border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex min-w-max gap-3">
        {profissionais.map((prof) => {
          const active = selectedProfissionalId === prof.id;

          return (
            <button
              key={prof.id}
              onClick={() => onSelect(prof.id)}
              className={clsx(
                "flex items-center gap-3 rounded-full border px-4 py-2 transition",
                active
                  ? "border-black bg-black text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
              )}
            >
              <img
                src={prof.foto_url || "https://placehold.co/60x60?text=Prof"}
                alt={prof.nome}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="text-left">
                <div className={clsx("text-[11px] leading-none", active ? "text-zinc-300" : "text-zinc-500")}>
                  Profissional
                </div>
                <div className="text-base font-bold leading-tight">{prof.nome}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}