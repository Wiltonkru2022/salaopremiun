import { NextResponse } from "next/server";

// Rota publica de compatibilidade: nao altera estado e orienta o uso do Clerk.

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      redirectTo: "/admin-master/clerk-login",
      message: "A confirmacao de MFA agora e concluida diretamente no Clerk.",
    },
    { status: 409, headers: { "Cache-Control": "no-store" } }
  );
}
