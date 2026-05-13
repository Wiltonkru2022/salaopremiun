"use client";

import { useMemo, useState } from "react";
import { LocateFixed, MapPin, Navigation, Search, SlidersHorizontal, X } from "lucide-react";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";

const MAX_REASONABLE_DISTANCE_KM = 2500;

const categories = [
  {
    label: "Barbeiros",
    query: "barba corte",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=240&auto=format&fit=crop",
  },
  {
    label: "Cabeleireiro",
    query: "cabelo escova",
    image:
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=240&auto=format&fit=crop",
  },
  {
    label: "Manicure",
    query: "unha manicure",
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=240&auto=format&fit=crop",
  },
  {
    label: "Sobrancelha",
    query: "sobrancelha",
    image:
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=240&auto=format&fit=crop",
  },
  {
    label: "Estética",
    query: "estetica pele",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=240&auto=format&fit=crop",
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function distanceInKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const radius = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function safeDistanceInKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const distance = distanceInKm(from, to);
  return distance > MAX_REASONABLE_DISTANCE_KM ? null : distance;
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
  const [sortMode, setSortMode] = useState<"recommended" | "rating" | "price">(
    "recommended"
  );
  const [selectedCity, setSelectedCity] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showMapPanel, setShowMapPanel] = useState(false);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(saloes.map((item) => item.cidade).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 6),
    [saloes]
  );

  const saloesWithDistance = useMemo(
    () =>
      saloes.map((salao) => ({
        ...salao,
        distanceKm:
          location && salao.latitude !== null && salao.longitude !== null
            ? safeDistanceInKm(location, {
                latitude: salao.latitude,
                longitude: salao.longitude,
              })
            : null,
      })),
    [location, saloes]
  );

  const orderedSaloes = useMemo(() => {
    const term = normalize(localSearch.trim());
    const base = saloesWithDistance.filter((salao) => {
      if (selectedCity && salao.cidade !== selectedCity) return false;
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
    });

    return base.sort((left, right) => {
      if (sortMode === "rating") {
        return (
          (right.notaMedia || 0) - (left.notaMedia || 0) ||
          right.totalAvaliacoes - left.totalAvaliacoes
        );
      }

      if (sortMode === "price") {
        if (left.precoMinimo === null && right.precoMinimo === null) return 0;
        if (left.precoMinimo === null) return 1;
        if (right.precoMinimo === null) return -1;
        return left.precoMinimo - right.precoMinimo;
      }

      if (location && left.distanceKm !== null && right.distanceKm !== null) {
        return left.distanceKm - right.distanceKm;
      }

      return (
        Number(Boolean(right.notaMedia)) - Number(Boolean(left.notaMedia)) ||
        right.totalAvaliacoes - left.totalAvaliacoes ||
        right.totalServicos - left.totalServicos ||
        left.nome.localeCompare(right.nome)
      );
    });
  }, [localSearch, location, saloesWithDistance, selectedCity, sortMode]);

  function requestLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Seu navegador não liberou localização.");
      setShowMapPanel(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 50000) {
          setLocationError(
            "Sua localização veio muito imprecisa. Use o filtro de cidade ou tente novamente."
          );
          setLocation(null);
          setShowMapPanel(true);
          return;
        }

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setShowMapPanel(true);
      },
      () => {
        setLocationError("Não conseguimos acessar sua localização agora.");
        setShowMapPanel(true);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 1000 * 60 * 5 }
    );
  }

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-4 overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(199,162,92,0.28),transparent_32%),linear-gradient(145deg,#071b1f,#18181b)] px-4 pb-8 pt-8 text-white md:-mx-6 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center text-3xl font-black tracking-[-0.06em]">
            Salão Premium
          </div>
          <label className="mt-7 flex h-16 items-center gap-3 rounded-2xl border border-white/20 bg-white px-5 shadow-2xl">
            <Search size={25} className="text-zinc-500" />
            <input
              type="search"
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Pesquise serviços ou salões"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400"
            />
          </label>

          <div className="mt-7 flex gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map((category) => (
              <button
                key={category.label}
                type="button"
                onClick={() => setLocalSearch(category.query)}
                className="w-[96px] shrink-0 text-center"
              >
                <img
                  src={category.image}
                  alt={category.label}
                  className="mx-auto h-24 w-24 rounded-full object-cover shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                />
                <div className="mt-3 whitespace-nowrap text-xs font-bold leading-tight text-white sm:text-sm">
                  {category.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-6">
          <div className="flex gap-3 overflow-x-auto pb-2">
          <button className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-bold text-zinc-950">
            <SlidersHorizontal size={18} />
            Filtros
          </button>
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as "recommended" | "rating" | "price")
            }
            className="h-12 shrink-0 rounded-xl border-0 bg-zinc-100 px-4 text-sm font-bold text-zinc-950 outline-none"
          >
            <option value="recommended">Ordenar: Recomendado</option>
            <option value="rating">Melhor avaliados</option>
            <option value="price">Menor preço</option>
          </select>
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-bold text-zinc-950"
          >
            <LocateFixed size={18} />
            Perto de mim
          </button>
          {availableCities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(selectedCity === city ? "" : city)}
              className={`h-12 shrink-0 rounded-xl px-4 text-sm font-bold ${
                selectedCity === city
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-950"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-black tracking-[-0.05em] text-zinc-950">
            Resultados ({orderedSaloes.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escolha um salão, veja avaliações e reserve seu horário.
          </p>
        </div>

        <div className="mt-6 grid gap-7 md:grid-cols-2">
          {orderedSaloes.map((salao) => (
            <ClientAppSalonCard
              key={salao.id}
              salao={salao}
              distanceKm={salao.distanceKm}
            />
          ))}
        </div>

        {!orderedSaloes.length ? (
          <div className="mt-8 rounded-[1.8rem] border border-zinc-200 bg-white p-6 text-center">
            <h3 className="text-lg font-black text-zinc-950">
              Nenhum salão com esses filtros
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Tente outro serviço, bairro ou cidade.
            </p>
          </div>
        ) : null}
      </section>

      {saloes.some((salao) => salao.latitude !== null && salao.longitude !== null) ? (
        <button
          type="button"
          onClick={location ? () => setShowMapPanel(true) : requestLocation}
          className="fixed bottom-24 right-4 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-zinc-950 px-5 text-base font-black text-white shadow-2xl md:hidden"
        >
          <MapPin size={22} />
          Mapa
        </button>
      ) : null}

      {showMapPanel ? (
        <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border border-zinc-200 bg-white p-4 shadow-[0_-24px_60px_rgba(15,23,42,0.22)] md:left-auto md:right-6 md:max-w-md md:rounded-[2rem]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-zinc-950">
                Salões perto de você
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Usamos sua localização apenas para calcular distância e abrir rota.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMapPanel(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
              aria-label="Fechar mapa"
            >
              <X size={18} />
            </button>
          </div>

          {locationError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              {locationError}
            </div>
          ) : null}

          <div className="mt-4 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
            {orderedSaloes
              .filter((salao) => salao.latitude !== null && salao.longitude !== null)
              .slice(0, 8)
              .map((salao) => {
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${salao.latitude},${salao.longitude}`;
                return (
                  <div
                    key={salao.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-zinc-950">
                        {salao.nome}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {salao.distanceKm !== null
                          ? `${salao.distanceKm.toFixed(1)} km`
                          : [salao.bairro, salao.cidade].filter(Boolean).join(" - ")}
                      </div>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-zinc-950 px-3 text-xs font-black text-white"
                    >
                      <Navigation size={15} />
                      Rota
                    </a>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
