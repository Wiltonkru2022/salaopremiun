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
import type {
  ClientAppNearbySalonListItem,
  ClientAppSalonListItem,
} from "@/lib/client-app/queries";

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

  return (
    <section className="min-h-dvh bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.35rem)] text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between">
          <h1 className="text-[2.65rem] font-black tracking-[-0.06em]">
            Explorar
          </h1>
          <a
            href="/app-cliente/notificacoes"
            className="flex h-12 w-12 items-center justify-center rounded-full text-[#f5b83d]"
            aria-label="Notificações"
          >
            <Bell size={29} />
          </a>
        </header>

        <label className="mt-7 flex h-[72px] items-center gap-4 rounded-[1.45rem] bg-[#151618] px-5 text-xl text-zinc-300">
          <Search size={31} />
          <input
            type="search"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Buscar salões ou serviços"
            className="min-w-0 flex-1 bg-transparent text-xl font-medium text-white outline-none placeholder:text-zinc-300"
          />
        </label>

        <div className="mt-9 grid grid-cols-4 gap-x-5 gap-y-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.label}
                type="button"
                onClick={() => setLocalSearch(category.query)}
                className="text-center"
              >
                <span className="mx-auto flex h-[86px] w-[86px] items-center justify-center rounded-full bg-[#151618] text-[#f5b83d]">
                  <Icon size={42} strokeWidth={1.7} />
                </span>
                <span className="mt-3 block text-base font-medium text-white">
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-2xl font-black">Salões para você</h2>
          <button className="inline-flex items-center gap-1 text-lg font-bold text-[#f5b83d]">
            Ver todos
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="mt-5 space-y-7">
          {orderedSaloes.length ? (
            orderedSaloes.map((salao) => (
              <ClientAppSalonCard
                key={salao.id}
                salao={salao}
                distanceKm={salao.distanceKm ?? null}
              />
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-white/8 bg-[#121315] p-6 text-center text-zinc-300">
              Nenhum salão encontrado agora.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
