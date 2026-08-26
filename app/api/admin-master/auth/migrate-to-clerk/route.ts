import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "A migração via Supabase Auth foi encerrada. Use o login Clerk do Admin Master.",
      redirectTo: "/admin-master/login",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
