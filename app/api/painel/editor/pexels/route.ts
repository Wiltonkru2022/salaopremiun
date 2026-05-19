import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const queryMap: Record<string, string> = {
  cabelo: "hair salon",
  unhas: "nail art beauty salon",
  manicure: "nail art beauty salon",
  maquiagem: "makeup beauty salon",
  estetica: "skincare facial spa",
  "cabelo loiro": "blonde hair salon",
  salao: "hair salon beauty",
};

function normalizeQuery(value: string) {
  const raw = value.trim().toLowerCase().slice(0, 80);
  return queryMap[raw] || raw || "hair salon beauty";
}

export async function GET(request: Request) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Banco de fotos ainda nao configurado. Adicione PEXELS_API_KEY na Vercel.",
        photos: [],
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const query = normalizeQuery(String(url.searchParams.get("query") || ""));
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&per_page=18&orientation=portrait`,
    {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Nao foi possivel buscar fotos no Pexels.", photos: [] },
      { status: response.status }
    );
  }

  const data = (await response.json()) as {
    photos?: Array<{
      id: number;
      alt?: string;
      photographer?: string;
      src?: {
        medium?: string;
        large2x?: string;
        large?: string;
      };
    }>;
  };

  return NextResponse.json({
    photos: (data.photos || []).map((photo) => ({
      id: String(photo.id),
      alt: photo.alt || "Foto de salao de beleza",
      photographer: photo.photographer || "",
      thumb: photo.src?.medium || "",
      src: photo.src?.large2x || photo.src?.large || photo.src?.medium || "",
    })),
  });
}
