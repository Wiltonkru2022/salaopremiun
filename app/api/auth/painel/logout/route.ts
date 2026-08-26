import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearPainelClerkSession().catch(() => undefined);

  try {
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => undefined);
  } catch {
    // Clerk pode estar ativo sem uma sessao Supabase no navegador.
  }

  return NextResponse.json({ ok: true });
}
