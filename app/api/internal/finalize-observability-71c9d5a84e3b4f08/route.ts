import { NextResponse } from "next/server";
import { limparObservabilidade } from "@/services/observabilityCleanupService";

const ONE_TIME_TOKEN = "f1d97a0e5c2b4a89b31e66a7c48d9021b83e7f9a2cd64860a0e17fc23b6d511e";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== ONE_TIME_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const result = await limparObservabilidade();
  return NextResponse.json({ ok: true, ...result });
}
