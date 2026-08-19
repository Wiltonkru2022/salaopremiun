import { NextRequest, NextResponse } from "next/server";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";

function normalizeDestino(value: string | null) {
  const fallback = "/app-profissional/login";
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (raw !== "/app-profissional" && !raw.startsWith("/app-profissional/")) {
    return fallback;
  }

  try {
    const base = new URL("https://salaopremium.local");
    const parsed = new URL(raw, base);
    if (parsed.origin !== base.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  await clearProfissionalSession();

  const destino = normalizeDestino(
    request.nextUrl.searchParams.get("destino")
  );

  return NextResponse.redirect(new URL(destino, request.url));
}
