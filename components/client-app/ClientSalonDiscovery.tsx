"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";

type ClientCoords = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(a: ClientCoords, b: ClientCoords) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);

  const base =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(base), Math.sqrt(1 - base)));
}

export default function ClientSalonDiscovery({
  saloes,
}: {
  saloes: ClientAppSalonListItem[];
}) {
  const [clientCoords, setClientCoords] = useState<ClientCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const orderedSaloes = useMemo(() => {
    if (!clientCoords) {
      return saloes.map((salao) => ({ salao, distanceKm: null as number | null }));
    }

    return saloes
      .map((salao) => {
        if (salao.latitude === null || salao.longitude === null) {
          return { salao, distanceKm: null as number | null };
        }

        return {
          salao,
          distanceKm: calculateDistanceKm(clientCoords, {
            latitude: salao.latitude,
            longitude: salao.longitude,
          }),
        };
      })
      .sort((left, right) => {
        if (left.distanceKm === null && right.distanceKm === null) return 0;
        if (left.distanceKm === null) return 1;
        if (right.distanceKm === null) return -1;
        return left.distanceKm - right.distanceKm;
      });
  }, [clientCoords, saloes]);

  function handleUseLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Seu navegador nao liberou geolocalizacao agora.");
      return;
    }

    setLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoadingLocation(false);
      },
      () => {
        setLocationError(
          "Nao foi possivel ler sua localizacao. Voce ainda pode buscar por bairro ou cidade."
        );
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 1000 * 60 * 10,
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={loadingLocation}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MapPin size={16} />
          {loadingLocation
            ? "Lendo localizacao..."
            : clientCoords
              ? "Ordenando por proximidade"
              : "Usar minha localizacao"}
        </button>

        {clientCoords ? (
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Saloes mais proximos primeiro
          </div>
        ) : null}
      </div>

      {locationError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {locationError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {orderedSaloes.map(({ salao, distanceKm }) => (
          <ClientAppSalonCard
            key={salao.id}
            salao={salao}
            distanceKm={distanceKm}
          />
        ))}
      </div>
    </div>
  );
}
