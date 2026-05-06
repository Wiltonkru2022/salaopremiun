"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, SlidersHorizontal, Star } from "lucide-react";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";

export default function ClientSalonDiscovery({
  saloes,
  initialSearch = "",
  isLoggedIn = false,
}: {
  saloes: ClientAppSalonListItem[];
  initialSearch?: string;
  isLoggedIn?: boolean;
}) {
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [sortMode, setSortMode] = useState<"recommended" | "rating" | "price">(
    "recommended"
  );
  const [onlyRated, setOnlyRated] = useState(false);
  const [onlyWithParking, setOnlyWithParking] = useState(false);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(saloes.map((item) => item.cidade).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 6),
    [saloes]
  );
  const [selectedCity, setSelectedCity] = useState("");

  const orderedSaloes = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    const base = saloes
      .filter((salao) => {
        if (selectedCity && salao.cidade !== selectedCity) return false;
        if (onlyRated && !salao.notaMedia) return false;
        if (onlyWithParking && !salao.estacionamento) return false;
        if (!term) return true;

        return [
          salao.nome,
          salao.bairro,
          salao.cidade,
          salao.descricaoPublica,
          ...salao.categorias,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .map((salao) => ({ salao }));

    return base.sort((left, right) => {
      if (sortMode === "rating") {
        return (
          (right.salao.notaMedia || 0) - (left.salao.notaMedia || 0) ||
          right.salao.totalAvaliacoes - left.salao.totalAvaliacoes
        );
      }

      if (sortMode === "price") {
        if (left.salao.precoMinimo === null && right.salao.precoMinimo === null) return 0;
        if (left.salao.precoMinimo === null) return 1;
        if (right.salao.precoMinimo === null) return -1;
        return left.salao.precoMinimo - right.salao.precoMinimo;
      }

      return (
        Number(Boolean(right.salao.notaMedia)) - Number(Boolean(left.salao.notaMedia)) ||
        right.salao.totalAvaliacoes - left.salao.totalAvaliacoes ||
        right.salao.totalServicos - left.salao.totalServicos ||
        left.salao.nome.localeCompare(right.salao.nome)
      );
    });
  }, [
    localSearch,
    onlyRated,
    onlyWithParking,
    saloes,
    selectedCity,
    sortMode,
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-white/70 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
              Descobrir
            </div>
            <h2 className="mt-1 text-2xl font-black text-zinc-950">
              Onde voce quer ir hoje?
            </h2>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto]">
          <label className="flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4">
            <Search size={17} className="text-zinc-500" />
            <input
              type="search"
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Servico, bairro ou salao"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </label>

          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as "recommended" | "rating" | "price")
            }
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 outline-none transition focus:border-zinc-400"
          >
            <option value="recommended">Recomendados</option>
            <option value="rating">Melhor avaliados</option>
            <option value="price">Menor preco</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600">
            <SlidersHorizontal size={14} />
            Filtros
          </div>
          {availableCities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(selectedCity === city ? "" : city)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selectedCity === city
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {city}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyRated((value) => !value)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              onlyRated
                ? "border-amber-700 bg-amber-50 text-amber-800"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <Star size={14} fill={onlyRated ? "currentColor" : "none"} />
            Com avaliacoes
          </button>
          <button
            type="button"
            onClick={() => setOnlyWithParking((value) => !value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              onlyWithParking
                ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Estacionamento
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600">
          <MapPin size={14} />
          Busque por bairro, cidade, servico ou nome do salao
        </div>
      </div>

      {orderedSaloes.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {orderedSaloes.map(({ salao }) => (
            <ClientAppSalonCard
              key={salao.id}
              salao={salao}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.8rem] border border-white/70 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
            Nenhum salao com esses filtros
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Limpe algum filtro ou tente buscar por outro bairro, cidade ou servico.
          </p>
        </div>
      )}
    </div>
  );
}
