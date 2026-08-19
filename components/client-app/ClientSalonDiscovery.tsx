"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Hand,
  Search,
  Scissors,
  ShieldPlus,
  Sparkles,
  UserRound,
} from "lucide-react";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";

const categories = [
  { label: "Cabelos", query: "cabelo", icon: Sparkles },
  { label: "Unhas", query: "unha manicure", icon: Hand },
  { label: "Sobrancelha", query: "sobrancelha", icon: ShieldPlus },
  { label: "Estética", query: "estetica", icon: Sparkles },
  { label: "Barbearia", query: "barba corte", icon: UserRound },
  { label: "Maquiagem", query: "maquiagem", icon: Sparkles },
  { label: "Depilação", query: "depilacao", icon: Scissors },
  { label: "Massagem", query: "massagem", icon: UserRound },
];

type DiscoverableSalon = ClientAppSalonListItem & {
  distanceKm?: number | null;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ClientSalonDiscovery({
  saloes,
  initialSearch = "",
}: {
  saloes: ClientAppSalonListItem[];
  initialSearch?: string;
  isLoggedIn?: boolean;
}) {
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [displaySaloes, setDisplaySaloes] = useState<DiscoverableSalon[]>(saloes);

  useEffect(() => {
    setDisplaySaloes(saloes);
  }, [saloes]);

  const orderedSaloes = useMemo(() => {
    const term = normalize(localSearch.trim());
    return displaySaloes
      .filter((salao) => {
        if (!term) return true;
        return normalize(
          [
            salao.nome,
            salao.bairro,
            salao.cidade,
            salao.descricaoPublica,
            ...salao.categorias,
          ]
            .filter(Boolean)
            .join(" ")
        ).includes(term);
      })
      .sort((left, right) => {
        if (left.distanceKm != null && right.distanceKm != null) {
          return left.distanceKm - right.distanceKm;
        }
        return (
          Number(Boolean(right.notaMedia)) - Number(Boolean(left.notaMedia)) ||
          right.totalAvaliacoes - left.totalAvaliacoes ||
          right.totalServicos - left.totalServicos ||
          left.nome.localeCompare(right.nome)
        );
      });
  }, [displaySaloes, localSearch]);

  function clearSearch() {
    setLocalSearch("");
    requestAnimationFrame(() => document.getElementById("client-salon-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <section className="min-h-dvh bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.35rem)] text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f5b83d]">Descubra seu próximo cuidado</div>
            <h1 className="mt-1 text-[2.65rem] font-black tracking-[-0.06em]">Explorar</h1>
          </div>
          <a
            href="/app-cliente/notificacoes"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5b83d]"
            aria-label="Notificações"
          >
            <Bell size={27} />
          </a>
        </header>

        <label className="mt-7 flex h-[68px] items-center gap-4 rounded-[1.35rem] border border-white/8 bg-[#151618] px-5 text-xl text-zinc-300 shadow-[0_16px_44px_rgba(0,0,0,0.28)]">
          <Search size={29} />
          <input
            type="search"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Buscar salões ou serviços"
            className="min-w-0 flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder:text-zinc-400"
          />
          {localSearch ? <button type="button" onClick={clearSearch} className="text-xs font-black uppercase tracking-wide text-[#f5b83d]">Limpar</button> : null}
        </label>

        <div className="mt-8 grid grid-cols-4 gap-x-4 gap-y-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const active = normalize(localSearch).includes(normalize(category.query.split(" ")[0]));
            return (
              <button
                key={category.label}
                type="button"
                onClick={() => setLocalSearch(category.query)}
                className="text-center"
              >
                <span className={`mx-auto flex h-[78px] w-[78px] items-center justify-center rounded-full border transition ${active ? "border-[#f5b83d] bg-[#2a2416] text-[#ffd46e]" : "border-white/8 bg-[#151618] text-[#f5b83d]"}`}>
                  <Icon size={36} strokeWidth={1.7} />
                </span>
                <span className="mt-2.5 block text-sm font-semibold text-white">{category.label}</span>
              </button>
            );
          })}
        </div>

        <div id="client-salon-results" className="mt-9 flex items-end justify-between gap-3 scroll-mt-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{localSearch ? "Resultados" : "Recomendados"}</div>
            <h2 className="mt-1 text-2xl font-black">{localSearch ? `${orderedSaloes.length} ${orderedSaloes.length === 1 ? "salão encontrado" : "salões encontrados"}` : "Salões para você"}</h2>
          </div>
          {localSearch ? (
            <button type="button" onClick={clearSearch} className="inline-flex items-center gap-1 text-sm font-black text-[#f5b83d]">Ver todos <ChevronRight size={19} /></button>
          ) : null}
        </div>

        <div className="mt-5 space-y-5">
          {orderedSaloes.length ? (
            orderedSaloes.map((salao) => (
              <ClientAppSalonCard key={salao.id} salao={salao} distanceKm={salao.distanceKm ?? null} />
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-white/8 bg-[#121315] p-6 text-center text-zinc-300">
              <div className="text-lg font-black text-white">Nada encontrado</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Tente outro serviço, bairro ou cidade.</p>
              <button type="button" onClick={clearSearch} className="mt-4 rounded-xl bg-[#f5b83d] px-4 py-2.5 text-sm font-black text-black">Limpar busca</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
