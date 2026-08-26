import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { clearPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearPainelClerkSession().catch(() => undefined);

  try {
    const database = await createClient();
    await database.auth.signOut().catch(() => undefined);
  } catch {
    // Clerk pode estar ativo sem uma sessao Neon no navegador.
  }

  return NextResponse.json({ ok: true });
}
