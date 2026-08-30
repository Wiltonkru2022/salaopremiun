import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Este fluxo foi substituído pelo login direto por e-mail e senha.",
      redirectTo: "/admin-master/login",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
