import { NextResponse } from "next/server";
import { clearPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

// Rota publica e idempotente: apenas remove o cookie de sessao do proprio navegador.

export const dynamic = "force-dynamic";

export async function POST() {
  await clearPainelClerkSession().catch(() => undefined);

  return NextResponse.json({ ok: true });
}
