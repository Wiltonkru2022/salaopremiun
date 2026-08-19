import { NextRequest, NextResponse } from "next/server";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";
import { normalizeSafeInternalPath } from "@/lib/security/safe-next-path";

export async function GET(request: NextRequest) {
  await clearProfissionalSession();

  const destino = normalizeSafeInternalPath(
    request.nextUrl.searchParams.get("destino"),
    "/app-profissional",
    "/app-profissional/login"
  );

  return NextResponse.redirect(new URL(destino, request.url));
}
