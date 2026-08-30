import { NextResponse } from "next/server";

import { clearPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

// Rota publica e idempotente.
// Remove a sessao interna do painel neste navegador.
// O signOut real do Clerk e executado no cliente antes desta rota.

export const dynamic = "force-dynamic";

export async function POST() {
  await clearPainelClerkSession().catch(() => undefined);

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
