import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { processPendingNotificationJobs } from "@/lib/notification-jobs";
import { queueOracleVpsNotificationProcessing } from "@/lib/oracle-vps/client";
import { processInactiveClientRecovery } from "@/lib/client-app/inactive-recovery";

async function handleCron(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const recovery = await processInactiveClientRecovery(20);
    try {
      const vpsResult = await queueOracleVpsNotificationProcessing({
        trigger: "cron",
        limit: 60,
      });
      return NextResponse.json({
        ok: true,
        provider: "oracle-vps",
        recovery,
        result: vpsResult,
      });
    } catch (oracleError) {
      const result = await processPendingNotificationJobs(60);
      return NextResponse.json({
        ok: true,
        provider: "vercel-fallback",
        recovery,
        oracleError:
          oracleError instanceof Error
            ? oracleError.message
            : "Falha ao processar notificações na VPS.",
        ...result,
      });
    }
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
