import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "A migracao de login legado foi encerrada. O Admin Master usa exclusivamente Clerk.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
