export type SalonAddressInput = {
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

export type SalonCoordinates = {
  latitude: number;
  longitude: number;
  precision: "endereco" | "cidade";
  provider: "nominatim";
};

type NominatimPlace = {
  lat?: string;
  lon?: string;
  importance?: number;
};

const BRAZIL_BOUNDS = {
  minLatitude: -34,
  maxLatitude: 6,
  minLongitude: -75,
  maxLongitude: -30,
};

function clean(value: string | null | undefined) {
  return String(value || "").trim();
}

function onlyNumbers(value: string | null | undefined) {
  return clean(value).replace(/\D/g, "");
}

function isInsideBrazil(latitude: number, longitude: number) {
  return (
    latitude >= BRAZIL_BOUNDS.minLatitude &&
    latitude <= BRAZIL_BOUNDS.maxLatitude &&
    longitude >= BRAZIL_BOUNDS.minLongitude &&
    longitude <= BRAZIL_BOUNDS.maxLongitude
  );
}

function isValidCoordinatePair(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return isInsideBrazil(latitude, longitude);
}

type GeocodeAttempt = {
  precision: SalonCoordinates["precision"];
  params: Record<string, string>;
};

function buildGeocodeAttempts(input: SalonAddressInput): GeocodeAttempt[] {
  const cep = onlyNumbers(input.cep);
  const endereco = clean(input.endereco);
  const numero = clean(input.numero);
  const bairro = clean(input.bairro);
  const cidade = clean(input.cidade);
  const estado = clean(input.estado).toUpperCase();
  const streetLine = [endereco, numero]
    .filter(Boolean)
    .join(", ");
  const structuredStreet = [numero, endereco].filter(Boolean).join(" ");
  const attempts: GeocodeAttempt[] = [];

  if (structuredStreet && cidade && estado) {
    attempts.push({
      precision: "endereco",
      params: {
        street: structuredStreet,
        city: cidade,
        state: estado,
        country: "Brasil",
        ...(cep ? { postalcode: cep } : {}),
      },
    });
  }

  if (streetLine && cidade && estado) {
    attempts.push({
      precision: "endereco",
      params: {
        q: [streetLine, bairro, cidade, estado, cep, "Brasil"]
          .filter(Boolean)
          .join(", "),
      },
    });
  }

  if (cidade && estado) {
    attempts.push({
      precision: "cidade",
      params: {
        city: cidade,
        state: estado,
        country: "Brasil",
        ...(cep ? { postalcode: cep } : {}),
      },
    });
  }

  return attempts;
}

function mapNominatimPlace(
  place: NominatimPlace | null | undefined,
  precision: SalonCoordinates["precision"]
): SalonCoordinates | null {
  const latitude = Number(place?.lat);
  const longitude = Number(place?.lon);

  if (!isValidCoordinatePair(latitude, longitude)) return null;

  return {
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
    precision,
    provider: "nominatim",
  };
}

export async function geocodeSalonAddress(
  input: SalonAddressInput
): Promise<SalonCoordinates | null> {
  const attempts = buildGeocodeAttempts(input);

  for (const attempt of attempts) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("addressdetails", "1");

    Object.entries(attempt.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "SalaoPremium/1.0 (suporte@salaopremiun.com.br)",
      },
      signal: AbortSignal.timeout(6500),
    });

    if (!response.ok) continue;

    const data = (await response.json().catch(() => [])) as unknown;
    if (!Array.isArray(data)) continue;

    const coordinates = mapNominatimPlace(
      data[0] as NominatimPlace | undefined,
      attempt.precision
    );

    if (coordinates) return coordinates;
  }

  return null;
}
