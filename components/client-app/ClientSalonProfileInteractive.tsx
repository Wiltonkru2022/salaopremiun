"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, MapPin, Share2, X } from "lucide-react";

type PortfolioPhoto = {
  id: string;
  imagemUrl: string;
  legenda: string | null;
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ClientSalonLiveDistance({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  useEffect(() => {
    if (latitude === null || longitude === null || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDistanceKm(
          haversineKm(
            position.coords.latitude,
            position.coords.longitude,
            latitude,
            longitude
          )
        );
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, [latitude, longitude]);

  if (distanceKm === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600">
      <MapPin size={15} />
      {distanceKm < 1
        ? `${Math.max(100, Math.round(distanceKm * 1000))} m de você`
        : `${distanceKm.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })} km de você`}
    </span>
  );
}

export function ClientSalonShareButton({
  salonName,
  compact = false,
}: {
  salonName: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: salonName,
          text: `Veja ${salonName} no Salão Premium`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Cancelar a folha de compartilhamento não precisa gerar erro na tela.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={
        compact
          ? "flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
          : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 shadow-sm"
      }
      aria-label="Compartilhar salão"
    >
      {copied ? <Check size={compact ? 26 : 22} /> : <Share2 size={compact ? 27 : 22} />}
      {!compact ? <span>{copied ? "Copiado" : "Compartilhar"}</span> : null}
    </button>
  );
}

export function ClientSalonPortfolioGallery({
  photos,
}: {
  photos: PortfolioPhoto[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = useMemo(
    () => photos.findIndex((photo) => photo.id === selectedId),
    [photos, selectedId]
  );
  const selected = selectedIndex >= 0 ? photos[selectedIndex] : null;

  useEffect(() => {
    if (!selected) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "ArrowLeft") {
        const next = (selectedIndex - 1 + photos.length) % photos.length;
        setSelectedId(photos[next]?.id || null);
      }
      if (event.key === "ArrowRight") {
        const next = (selectedIndex + 1) % photos.length;
        setSelectedId(photos[next]?.id || null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photos, selected, selectedIndex]);

  if (!photos.length) return null;

  function move(direction: -1 | 1) {
    if (selectedIndex < 0) return;
    const next = (selectedIndex + direction + photos.length) % photos.length;
    setSelectedId(photos[next]?.id || null);
  }

  return (
    <>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedId(photo.id)}
            className="relative h-48 w-40 shrink-0 snap-start overflow-hidden rounded-[1.25rem] bg-zinc-100 sm:h-56 sm:w-48"
          >
            <img
              src={photo.imagemUrl}
              alt={photo.legenda || "Trabalho do salão"}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto do portfólio"
        >
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="Fechar"
          >
            <X size={28} />
          </button>

          {photos.length > 1 ? (
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={30} />
            </button>
          ) : null}

          <div className="max-h-[88dvh] max-w-4xl text-center">
            <img
              src={selected.imagemUrl}
              alt={selected.legenda || "Trabalho do salão"}
              className="max-h-[78dvh] max-w-full rounded-2xl object-contain"
            />
            {selected.legenda ? (
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/80">
                {selected.legenda}
              </p>
            ) : null}
          </div>

          {photos.length > 1 ? (
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
              aria-label="Próxima foto"
            >
              <ChevronRight size={30} />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
