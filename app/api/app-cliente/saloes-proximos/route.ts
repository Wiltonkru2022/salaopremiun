import { NextResponse } from "next/server";
import { listNearbyClientAppSaloes } from "@/lib/client-app/queries";

function parseCoordinate(value: string | null) {
  const numeric = Number(String(value || "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = parseCoordinate(url.searchParams.get("lat"));
  const longitude = parseCoordinate(url.searchParams.get("lon"));
  const search = String(url.searchParams.get("busca") || "").trim();

  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { message: "Localizacao invalida para buscar saloes proximos." },
      { status: 400 }
    );
  }

  const saloes = await listNearbyClientAppSaloes({
    latitude,
    longitude,
    search,
    radiusKm: 20,
    limit: 24,
  });

  return NextResponse.json({ saloes });
}
