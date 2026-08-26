import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      provider: "clerk",
      message: "O login por senha legado foi removido. Use o login Clerk do Admin Master.",
      redirectTo: "https://login.salaopremiun.com.br/admin-master/clerk-login",
    },
    {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
