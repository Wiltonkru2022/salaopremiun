import { NextResponse } from "next/server";

// Rota publica de compatibilidade: o login efetivo acontece diretamente no Clerk.

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      provider: "clerk",
      redirectTo: "/admin-master/clerk-login",
      message: "O Admin Master agora usa autenticação Clerk. Entre pela tela segura do Clerk.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
