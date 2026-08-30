import { NextResponse } from "next/server";

// Rota publica de compatibilidade: nao altera estado e orienta o uso do Clerk.

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      redirectTo: "/admin-master/login",
      message: "Conclua a verificação em duas etapas na tela segura de acesso.",
    },
    { status: 409, headers: { "Cache-Control": "no-store" } }
  );
}
