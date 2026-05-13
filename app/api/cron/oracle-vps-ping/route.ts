import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { sendOracleVpsPing } from "@/lib/oracle-vps/client";

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

  return NextResponse.json(result, {
    status: result.ok ? 200 : result.configured ? 502 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
