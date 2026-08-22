import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// publicRoute: healthcheck publico usado por uptime/deploy.
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "salaopremium",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
