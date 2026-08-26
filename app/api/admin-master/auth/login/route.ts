import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "O login por senha legado foi desativado. Use o acesso Clerk do Admin Master.",
      redirectTo: "/admin-master/login",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
