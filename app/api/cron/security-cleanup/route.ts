import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { cleanupPrincipalSecurityAttempts } from "@/lib/security/cleanup";

async function handleCron(request: Request) {
  const authorized = verifyBearerSecret(
    request.headers.get("authorization"),
    process.env.CRON_SECRET
  );

  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: "Não autorizado." },
      { status: 401 }
    );
  }

  const principal = await cleanupPrincipalSecurityAttempts({ retentionDays: 30 });

  return NextResponse.json(
    {
      ok: !principal.error,
      provider: "database",
      principal: {
        cutoff: principal.cutoff,
        deleted: principal.deleted,
        error: principal.error,
      },
    },
    {
      status: principal.error ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
