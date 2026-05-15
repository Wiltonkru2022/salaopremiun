import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { queueOracleVpsSecurityCleanup } from "@/lib/oracle-vps/client";
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
  const vps = await queueOracleVpsSecurityCleanup({
    trigger: "vercel_cron_security_cleanup",
    securityRetentionDays: 90,
  }).catch((error) => ({
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : "Falha ao limpar eventos de segurança na VPS.",
  }));

  return NextResponse.json(
    {
      ok: !principal.error,
      principal: {
        cutoff: principal.cutoff,
        deleted: principal.deleted,
        error: principal.error,
      },
      vps,
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
