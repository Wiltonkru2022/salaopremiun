import { NextRequest, NextResponse } from "next/server";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";

function normalizeDestino(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/app-profissional/login";
  }

  return value;
}

export async function GET(request: NextRequest) {
  await clearProfissionalSession();

  const destino = normalizeDestino(
    request.nextUrl.searchParams.get("destino")
  );

  return NextResponse.redirect(new URL(destino, request.url));
}
