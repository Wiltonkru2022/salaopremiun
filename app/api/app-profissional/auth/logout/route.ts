import { NextResponse } from "next/server";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";

// publicRoute: logout apenas remove a sessao local do app profissional.
export async function POST() {
  await clearProfissionalSession();
  return NextResponse.json({ ok: true });
}
