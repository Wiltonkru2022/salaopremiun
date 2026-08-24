import { NextResponse } from "next/server";

const UF_BY_NAME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseCoordinate(value: string | null, max: number) {
  const numeric = Number(String(value || "").replace(",", "."));
  return Number.isFinite(numeric) && Math.abs(numeric) <= max ? numeric : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = parseCoordinate(url.searchParams.get("lat"), 90);
  const longitude = parseCoordinate(url.searchParams.get("lon"), 180);

  if (latitude === null || longitude === null) {
    return NextResponse.json({ message: "Localização inválida." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "pt-BR,pt;q=0.9",
          "User-Agent": "SalaoPremium/1.0 (app cliente; reverse geocoding)",
        },
        signal: controller.signal,
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ message: "Não foi possível identificar sua cidade." }, { status: 502 });
    }

    const payload = (await response.json()) as {
      address?: Record<string, string | undefined>;
    };
    const address = payload.address || {};
    const cidade = String(
      address.city || address.town || address.municipality || address.village || address.city_district || ""
    ).trim();
    const iso = String(address["ISO3166-2-lvl4"] || address["ISO3166-2-lvl6"] || "").trim().toUpperCase();
    const estado = iso.startsWith("BR-")
      ? iso.slice(3)
      : UF_BY_NAME[normalize(address.state)] || "";

    if (!cidade || !estado) {
      return NextResponse.json({ message: "Cidade não identificada." }, { status: 404 });
    }

    return NextResponse.json({ cidade, estado });
  } catch {
    return NextResponse.json({ message: "Não foi possível identificar sua cidade." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
