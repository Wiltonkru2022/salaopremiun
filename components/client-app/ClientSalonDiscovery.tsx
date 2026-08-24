"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Hand,
  LocateFixed,
  MapPin,
  Search,
  Scissors,
  ShieldPlus,
  Sparkles,
  UserRound,
} from "lucide-react";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
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

type LocationOption = {
  estado: string;
  cidade: string;
};

type LocationStatus = "locating" | "loading" | "ready" | "needs-selection" | "error";

const STORAGE_KEY = "salaopremium_cliente_localidade";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ClientSalonDiscovery({
  initialSearch = "",
}: {
  initialSearch?: string;
  isLoggedIn?: boolean;
}) {
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [displaySaloes, setDisplaySaloes] = useState<ClientAppSalonListItem[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("locating");
  const [locationMessage, setLocationMessage] = useState("Identificando sua cidade...");

  async function loadSaloes(estado: string, cidade: string, persist = true) {
    if (!estado || !cidade) {
      setDisplaySaloes([]);
      setLocationStatus("needs-selection");
      return;
    }

    setLocationStatus("loading");
    setLocationMessage(`Buscando salões em ${cidade} - ${estado}...`);

    try {
      const response = await fetch(
        `/api/app-cliente/saloes?estado=${encodeURIComponent(estado)}&cidade=${encodeURIComponent(cidade)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        saloes?: ClientAppSalonListItem[];
        message?: string;
      };

      if (!response.ok) throw new Error(payload.message || "Não foi possível carregar os salões.");

      setDisplaySaloes(Array.isArray(payload.saloes) ? payload.saloes : []);
      setSelectedState(estado);
      setSelectedCity(cidade);
      setLocationStatus("ready");
      setLocationMessage("");

      if (persist) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ estado, cidade }));
      }
    } catch {
      setDisplaySaloes([]);
      setLocationStatus("error");
      setLocationMessage("Não foi possível carregar os salões desta cidade agora.");
    }
  }

  async function resolveCoordinates(latitude: number, longitude: number) {
    const response = await fetch(
      `/api/app-cliente/localizacao-cidade?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
      { cache: "no-store" }
    );
    const payload = (await response.json().catch(() => ({}))) as {
      cidade?: string;
      estado?: string;
      message?: string;
    };

    if (!response.ok || !payload.cidade || !payload.estado) {
      throw new Error(payload.message || "Cidade não identificada.");
    }

    await loadSaloes(payload.estado, payload.cidade, false);
  }

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("needs-selection");
      setLocationMessage("Seu aparelho não disponibilizou a localização. Escolha o estado e a cidade.");
      return;
    }

    setLocationStatus("locating");
    setLocationMessage("Identificando sua cidade...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void resolveCoordinates(position.coords.latitude, position.coords.longitude).catch(() => {
          setLocationStatus("needs-selection");
          setLocationMessage("Não conseguimos identificar sua cidade. Escolha abaixo.");
        });
      },
      () => {
        setLocationStatus("needs-selection");
        setLocationMessage("Permita a localização ou escolha seu estado e sua cidade.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const response = await fetch("/api/app-cliente/localidades", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { localidades?: LocationOption[] };
        if (!cancelled) setLocations(Array.isArray(payload.localidades) ? payload.localidades : []);
      } catch {
        if (!cancelled) setLocations([]);
      }

      if (cancelled) return;

      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as LocationOption | null;
        if (saved?.estado && saved?.cidade) {
          await loadSaloes(saved.estado, saved.cidade, false);
          return;
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      detectCurrentLocation();
    }

    void initialize();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const states = useMemo(
    () => Array.from(new Set(locations.map((item) => item.estado))).sort((a, b) => a.localeCompare(b)),
    [locations]
  );

  const cities = useMemo(
    () =>
      locations
        .filter((item) => item.estado === selectedState)
        .map((item) => item.cidade)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [locations, selectedState]
  );

  const orderedSaloes = useMemo(() => {
    const term = normalize(localSearch.trim());
    return displaySaloes
      .filter((salao) => {
        if (!term) return true;
        return normalize(
          [salao.nome, salao.bairro, salao.cidade, salao.descricaoPublica, ...salao.categorias]
            .filter(Boolean)
            .join(" ")
        ).includes(term);
      })
      .sort(
        (left, right) =>
          Number(Boolean(right.notaMedia)) - Number(Boolean(left.notaMedia)) ||
          right.totalAvaliacoes - left.totalAvaliacoes ||
          right.totalServicos - left.totalServicos ||
          left.nome.localeCompare(right.nome)
      );
  }, [displaySaloes, localSearch]);

  function clearSearch() {
    setLocalSearch("");
    requestAnimationFrame(() =>
      document.getElementById("client-salon-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  function handleStateChange(value: string) {
    setSelectedState(value);
    setSelectedCity("");
    setDisplaySaloes([]);
    setLocationStatus("needs-selection");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function handleCityChange(value: string) {
    setSelectedCity(value);
    if (selectedState && value) void loadSaloes(selectedState, value);
  }

  const hasLocation = Boolean(selectedState && selectedCity && locationStatus === "ready");

  return (
    <section className="min-h-dvh bg-[#050505] px-5 pb-28 pt-0 text-white">
      <div className="mx-auto max-w-md">
        <header className="sp-mobile-fixed sticky top-0 z-50 -mx-5 flex items-center justify-between border-b border-white/8 bg-[#050505]/96 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f5b83d]">Descubra seu próximo cuidado</div>
            <h1 className="mt-1 text-[2.15rem] font-black tracking-[-0.06em]">Explorar</h1>
          </div>
          <div className="flex items-center gap-1">
            <a href="/app-cliente/notificacoes" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5b83d]" aria-label="Notificações">
              <Bell size={27} />
            </a>
            <ClientAppDrawerNav isDark />
          </div>
        </header>

        <div className="mt-6 rounded-[1.35rem] border border-white/8 bg-[#121315] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#f5b83d]">
                <MapPin size={16} /> Localização
              </div>
              <div className="mt-1 truncate text-base font-black text-white">
                {hasLocation ? `Salões em ${selectedCity} - ${selectedState}` : "Escolha onde deseja buscar"}
              </div>
              {locationMessage ? <p className="mt-1 text-xs leading-5 text-zinc-400">{locationMessage}</p> : null}
            </div>
            <button type="button" onClick={detectCurrentLocation} className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#f5b83d]/30 bg-[#2a2416] px-3 text-xs font-black text-[#ffd46e]">
              <LocateFixed size={17} /> Agora
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">Estado</span>
              <select value={selectedState} onChange={(event) => handleStateChange(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-[#1a1b1e] px-3 text-sm font-bold text-white outline-none">
                <option value="">Selecione</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">Cidade</span>
              <select value={selectedCity} onChange={(event) => handleCityChange(event.target.value)} disabled={!selectedState} className="h-12 w-full rounded-xl border border-white/10 bg-[#1a1b1e] px-3 text-sm font-bold text-white outline-none disabled:opacity-45">
                <option value="">Selecione</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
          </div>
        </div>

        <label className="mt-4 flex h-[68px] items-center gap-4 rounded-[1.35rem] border border-white/8 bg-[#151618] px-5 text-xl text-zinc-300 shadow-[0_16px_44px_rgba(0,0,0,0.28)]">
          <Search size={29} />
          <input type="search" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Buscar salões ou serviços" className="min-w-0 flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder:text-zinc-400" />
          {localSearch ? <button type="button" onClick={clearSearch} className="text-xs font-black uppercase tracking-wide text-[#f5b83d]">Limpar</button> : null}
        </label>

        <div className="mt-8 grid grid-cols-4 gap-x-4 gap-y-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const active = normalize(localSearch).includes(normalize(category.query.split(" ")[0]));
            return (
              <button key={category.label} type="button" onClick={() => setLocalSearch(category.query)} className="text-center">
                <span className={`mx-auto flex h-[78px] w-[78px] items-center justify-center rounded-full border transition ${active ? "border-[#f5b83d] bg-[#2a2416] text-[#ffd46e]" : "border-white/8 bg-[#151618] text-[#f5b83d]"}`}>
                  <Icon size={36} strokeWidth={1.7} />
                </span>
                <span className="mt-2.5 block text-sm font-semibold text-white">{category.label}</span>
              </button>
            );
          })}
        </div>

        <div id="client-salon-results" className="mt-9 flex items-end justify-between gap-3 scroll-mt-24">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{localSearch ? "Resultados" : "Na sua cidade"}</div>
            <h2 className="mt-1 text-2xl font-black">
              {hasLocation
                ? localSearch
                  ? `${orderedSaloes.length} ${orderedSaloes.length === 1 ? "salão encontrado" : "salões encontrados"}`
                  : `Salões em ${selectedCity}`
                : "Selecione sua localização"}
            </h2>
          </div>
          {localSearch ? <button type="button" onClick={clearSearch} className="inline-flex items-center gap-1 text-sm font-black text-[#f5b83d]">Ver todos <ChevronRight size={19} /></button> : null}
        </div>

        <div className="mt-5 space-y-5">
          {locationStatus === "locating" || locationStatus === "loading" ? (
            <div className="rounded-[1.35rem] border border-white/8 bg-[#121315] p-6 text-center text-zinc-300">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[#f5b83d]" />
              <p className="mt-3 text-sm text-zinc-400">{locationMessage}</p>
            </div>
          ) : !hasLocation ? (
            <div className="rounded-[1.35rem] border border-white/8 bg-[#121315] p-6 text-center text-zinc-300">
              <MapPin className="mx-auto text-[#f5b83d]" size={30} />
              <div className="mt-3 text-lg font-black text-white">Informe sua cidade</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Use sua localização atual ou selecione Estado e Cidade acima. Não mostramos salões de outras cidades sem você escolher.</p>
            </div>
          ) : orderedSaloes.length ? (
            orderedSaloes.map((salao) => <ClientAppSalonCard key={salao.id} salao={salao} distanceKm={null} />)
          ) : (
            <div className="rounded-[1.35rem] border border-white/8 bg-[#121315] p-6 text-center text-zinc-300">
              <div className="text-lg font-black text-white">Nenhum salão encontrado em {selectedCity}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Tente outro serviço ou escolha outra cidade no filtro.</p>
              {localSearch ? <button type="button" onClick={clearSearch} className="mt-4 rounded-xl bg-[#f5b83d] px-4 py-2.5 text-sm font-black text-black">Limpar busca</button> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
