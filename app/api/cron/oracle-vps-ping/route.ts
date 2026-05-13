import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import {
  queueOracleVpsBackup,
  queueOracleVpsCleanup,
  queueOracleVpsReport,
  sendOracleVpsPing,
} from "@/lib/oracle-vps/client";

async function runOptionalStep<T>(name: string, fn: () => Promise<T>) {
  try {
    return {
      name,
      ok: true,
      result: await fn(),
    };
  } catch (error) {
    return {
      name,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao executar rotina na VPS Oracle.",
    };
  }
}

async function handleCron(request: Request) {
  const authorized = verifyBearerSecret(
    request.headers.get("authorization"),
    process.env.CRON_SECRET
  );

  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: "Nao autorizado." },
      { status: 401 }
    );
  }

  const result = await sendOracleVpsPing({
    action: "cron_daily_oracle_vps_ping",
    source: "vercel_cron",
  });
  const maintenance = await Promise.all([
    runOptionalStep("cleanup_logs", () =>
      queueOracleVpsCleanup({
        trigger: "daily_ping",
        retention: "bounded_ndjson",
      })
    ),
    runOptionalStep("backup_metadata", () =>
      queueOracleVpsBackup({
        trigger: "daily_ping",
        mode: "metadata_only",
      })
    ),
    runOptionalStep("precalcular_relatorio", () =>
      queueOracleVpsReport({
        trigger: "daily_ping",
        dryRun: false,
        scope: "admin_master_daily",
      })
    ),
  ]);

  return NextResponse.json(
    {
      ...result,
      maintenance,
    },
    {
    status: result.ok ? 200 : result.configured ? 502 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
    }
  );
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
