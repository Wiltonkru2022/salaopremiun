import { NextResponse } from "next/server";

// Rota publica de compatibilidade: o login efetivo acontece diretamente no Clerk.

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      provider: "clerk",
      redirectTo: "/admin-master/login",
      message: "Continue pela tela segura de acesso do SalãoPremium.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
