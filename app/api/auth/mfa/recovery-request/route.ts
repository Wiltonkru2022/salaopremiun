import { NextResponse } from "next/server";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export async function POST() {
  const session = await readPainelClerkSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sessao invalida." },
      { status: 401 }
    );
  }

  const redirectTo = new URL(
    "https://login.salaopremiun.com.br/login-clerk"
  );
  redirectTo.searchParams.set("next", "/perfil-salao");
  redirectTo.searchParams.set("mfa", "recovery");

  return NextResponse.json({
    ok: true,
    provider: "clerk",
    message: "A recuperacao do segundo fator agora e administrada pelo Clerk.",
    redirectTo: redirectTo.toString(),
  });
}
