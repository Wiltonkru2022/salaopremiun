import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      provider: "clerk",
      message: "A confirmação de MFA agora é concluída diretamente no Clerk.",
      redirectTo: "https://login.salaopremiun.com.br/admin-master/clerk-login?mfa=1",
    },
    {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
