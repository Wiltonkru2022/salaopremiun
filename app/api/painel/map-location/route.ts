import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

type MapSearchRequest =
  | {
      type: "search";
      candidates?: string[];
    }
  | {
      type: "reverse";
      latitude?: string;
      longitude?: string;
    };

const USER_AGENT = "SalaoPremium/1.0 painel-map-location";

function parseCoordinate(value: unknown) {
  const numeric = Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function uniqueCandidates(candidates: unknown) {
  if (!Array.isArray(candidates)) return [];

  return Array.from(
    new Set(
      candidates
        .map((candidate) => String(candidate || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 6);
}

async function fetchNominatim(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mapa respondeu ${response.status}.`);
  }

  return response.json();
}

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para buscar o mapa." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | MapSearchRequest
    | null;

  if (!body?.type) {
    return NextResponse.json(
      { message: "Informe uma busca valida para o mapa." },
      { status: 400 }
    );
  }

  try {
    if (body.type === "search") {
      const candidates = uniqueCandidates(body.candidates);

      if (!candidates.length) {
        return NextResponse.json(
          { message: "Digite rua, bairro ou cidade para posicionar o mapa." },
          { status: 400 }
        );
      }

      for (const candidate of candidates) {
        const params = new URLSearchParams({
          format: "jsonv2",
          countrycodes: "br",
          limit: "1",
          q: candidate,
        });
        const data = (await fetchNominatim(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`
        )) as Array<{ lat?: string; lon?: string }>;
        const latitude = parseCoordinate(data[0]?.lat);
        const longitude = parseCoordinate(data[0]?.lon);

        if (latitude !== null && longitude !== null) {
          return NextResponse.json({
            ok: true,
            latitude: latitude.toFixed(7),
            longitude: longitude.toFixed(7),
          });
        }
      }

      return NextResponse.json({
        ok: false,
        message:
          "Nao achei esse texto no mapa. Tente rua, bairro e cidade, ou arraste o mapa ate o salao.",
      });
    }

    const latitude = parseCoordinate(body.latitude);
    const longitude = parseCoordinate(body.longitude);

    if (latitude === null || longitude === null) {
      return NextResponse.json(
        { message: "Ponto do mapa invalido." },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      format: "jsonv2",
      lat: latitude.toFixed(7),
      lon: longitude.toFixed(7),
      addressdetails: "1",
    });
    const data = (await fetchNominatim(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
    )) as { address?: unknown };

    return NextResponse.json({
      ok: true,
      address: data.address || null,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      message:
        "Nao consegui consultar a rua agora. O mapa continua funcionando para marcar o ponto.",
    });
  }
}
