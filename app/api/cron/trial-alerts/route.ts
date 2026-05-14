import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { queueOracleVpsTrialAlerts } from "@/lib/oracle-vps/client";

async function handleCron(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const result = await queueOracleVpsTrialAlerts({
      trigger: "cron",
      limit: 80,
    });

    return NextResponse.json({
      ok: true,
      provider: "oracle-vps",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "oracle-vps",
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar avisos de teste gratis.",
      },
      { status: 502 }
    );
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
