"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { normalizeExternalDestination } from "@/lib/parcerias/urls";

type Campanha = {
  id: string;
  parceiro: string;
  titulo: string;
  subtitulo?: string | null;
  imagemUrl?: string | null;
  altText?: string | null;
  ctaTexto?: string | null;
  destinoUrl?: string | null;
};

const ROTATION_MS = 20_000;
const VIEWER_KEY = "salaopremium:campaigns:viewer";

function getViewerSeed() {
  if (typeof window === "undefined") return "server";
  let seed = window.localStorage.getItem(VIEWER_KEY);
  if (!seed) {
    seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VIEWER_KEY, seed);
  }
  return seed;
}

export default function ClientAppDrawerAd() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [index, setIndex] = useState(0);
  const [imageBroken, setImageBroken] = useState(false);
  const campanha = campanhas[index] || null;

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      publico: "cliente",
      local: "app_cliente",
      modo: "lista",
      seed: getViewerSeed(),
    });

    fetch(`/api/parcerias/ativos?${params.toString()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return;
        const lista = Array.isArray(payload?.campanhas) ? payload.campanhas : [];
        setCampanhas(lista);
        setIndex(0);
      })
      .catch(() => {
        if (active) setCampanhas([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (campanhas.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % campanhas.length);
    }, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [campanhas.length]);

  useEffect(() => {
    setImageBroken(false);
    if (!campanha?.id) return;

    void fetch("/api/parcerias/ativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCampanha: campanha.id,
        local: "app_cliente",
        tipo: "impressao",
      }),
      keepalive: true,
    });
  }, [campanha?.id]);

  const destination = useMemo(
    () => normalizeExternalDestination(campanha?.destinoUrl || null),
    [campanha?.destinoUrl]
  );

  if (!campanha) return null;

  function handleClick() {
    if (!campanha) return;

    void fetch("/api/parcerias/ativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCampanha: campanha.id,
        local: "app_cliente",
        tipo: "clique",
      }),
      keepalive: true,
    });

    if (destination) {
      window.open(destination, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="mt-4 border-t border-zinc-100 pt-4" aria-label="Publicidade">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
          <Megaphone size={12} /> Publicidade
        </span>
        {campanhas.length > 1 ? (
          <span className="text-[10px] font-bold text-zinc-400">Troca a cada 20s</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={!destination}
        className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition enabled:hover:border-zinc-300 enabled:hover:shadow-md disabled:cursor-default"
        aria-label={destination ? `${campanha.titulo}. Abrir anúncio` : campanha.titulo}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
          {campanha.imagemUrl && !imageBroken ? (
            <img
              src={campanha.imagemUrl}
              alt={campanha.altText || campanha.titulo}
              className="h-full w-full object-contain"
              loading="eager"
              decoding="async"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-950 px-5 text-center text-sm font-black text-white">
              {campanha.titulo}
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
            Anúncio
          </span>
        </div>

        <div className="p-3">
          <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
            {campanha.parceiro}
          </div>
          <div className="mt-1 line-clamp-2 text-sm font-black leading-5 text-zinc-950">
            {campanha.titulo}
          </div>
          {campanha.subtitulo ? (
            <div className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
              {campanha.subtitulo}
            </div>
          ) : null}
          {destination ? (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-black text-zinc-700">
              {campanha.ctaTexto || "Saiba mais"} <ExternalLink size={12} />
            </div>
          ) : null}
        </div>
      </button>

      {campanhas.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1" aria-hidden="true">
          {campanhas.slice(0, 8).map((item, itemIndex) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all ${
                itemIndex === index ? "w-4 bg-zinc-900" : "w-1.5 bg-zinc-300"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
