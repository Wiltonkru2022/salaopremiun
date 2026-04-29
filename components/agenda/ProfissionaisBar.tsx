"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    function syncButtons() {
      const current = scrollerRef.current;
      if (!current) return;

      setCanScrollLeft(current.scrollLeft > 8);
      setCanScrollRight(
        current.scrollLeft + current.clientWidth < current.scrollWidth - 8
      );
    }

    syncButtons();
    element.addEventListener("scroll", syncButtons);
    window.addEventListener("resize", syncButtons);

    return () => {
      element.removeEventListener("scroll", syncButtons);
      window.removeEventListener("resize", syncButtons);
    };
  }, [profissionais]);

  function scrollByAmount(direction: "left" | "right") {
    const element = scrollerRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-white/75 bg-white/94 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur ${
        densityMode === "reception" ? "px-3.5 py-2" : "px-3.5 py-2.5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-semibold tracking-[-0.02em] text-slate-900">
          Equipe em foco
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
            {profissionais.length} profissional(is)
          </div>

          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            disabled={!canScrollLeft}
            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] disabled:cursor-not-allowed disabled:opacity-45"
            title="Ver profissionais anteriores"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            disabled={!canScrollRight}
            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] disabled:cursor-not-allowed disabled:opacity-45"
            title="Ver mais profissionais"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={`${
          densityMode === "reception" ? "mt-0.5" : "mt-1"
        } overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        <div
          className={`flex min-w-max ${
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
                      ? "min-w-[132px] px-2.5 py-1.5"
                      : "min-w-[154px] px-3 py-2 xl:min-w-[172px]"
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
                      densityMode === "reception" ? "h-7 w-7" : "h-8 w-8"
                    } rounded-full object-cover`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`${
                      densityMode === "reception"
                        ? "h-7 w-7 text-[10px]"
                        : "h-8 w-8 text-sm"
                    } flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-700`}
                  >
                    {prof.nome?.trim()?.charAt(0)?.toUpperCase() || "P"}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div
                    className={clsx(
                      "text-[10px] uppercase tracking-[0.14em]",
                      active ? "text-violet-500" : "text-zinc-400"
                    )}
                  >
                    {subtitle}
                  </div>
                  <div
                    className={`mt-0.5 truncate ${
                      densityMode === "reception"
                        ? "text-[11px]"
                        : "text-[12px]"
                    } font-bold leading-tight`}
                  >
                    {prof.nome}
                  </div>
                </div>

                <span
                  className={clsx(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
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
