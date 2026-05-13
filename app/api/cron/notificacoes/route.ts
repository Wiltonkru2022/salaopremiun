import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { processPendingNotificationJobs } from "@/lib/notification-jobs";
import { mirrorOracleVpsNotificationProcessing } from "@/lib/oracle-vps/client";

async function handleCron(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const result = await processPendingNotificationJobs(60);
    void mirrorOracleVpsNotificationProcessing({
      trigger: "cron",
      localResult: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar notificacoes.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
