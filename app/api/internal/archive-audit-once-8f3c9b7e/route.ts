import { NextResponse } from "next/server";
import { limparObservabilidade } from "@/services/observabilityCleanupService";

const ONE_TIME_TOKEN = "8f3c9b7e-4d21-47e9-8e77-1c2a6f50b934";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== ONE_TIME_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const result = await limparObservabilidade();
  return NextResponse.json({ ok: true, ...result });
}
