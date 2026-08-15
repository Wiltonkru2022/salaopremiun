import { NextResponse } from "next/server";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";

export async function POST() {
  await clearProfissionalSession();
  return NextResponse.json({ ok: true });
}
