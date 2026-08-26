import { NextRequest, NextResponse } from "next/server";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

async function requireSession() {
  const session = await readPainelClerkSession();
  if (!session) throw new Error("Sessao invalida.");
  return session;
}

export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json({
      ok: true,
      provider: "clerk",
      factorActive: session.mfaVerified,
      currentLevel: session.mfaVerified ? "aal2" : "aal1",
      backupCodesRemaining: null,
      managedExternally: true,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    await requireSession();
    return NextResponse.json(
      {
        ok: false,
        provider: "clerk",
        managedExternally: true,
        error: "MFA e codigos de recuperacao agora sao gerenciados pelo Clerk. Reautentique pela tela oficial de seguranca.",
        redirectTo: "/seguranca/mfa",
      },
      { status: 409 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
  }
}
