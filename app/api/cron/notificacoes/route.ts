import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { processPendingNotificationJobs } from "@/lib/notification-jobs";
import { processInactiveClientRecovery } from "@/lib/client-app/inactive-recovery";
import {
  processDueWhatsAppReminders,
  processPendingAutomaticWhatsAppEvents,
} from "@/lib/whatsapp/automatic-events";

function shouldRunClientRecovery() {
  const now = new Date();
  return now.getUTCMinutes() % 30 === 0;
}

async function handleCron(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const recovery = shouldRunClientRecovery()
      ? await processInactiveClientRecovery(20)
      : null;

    const [result, whatsappAutomatic, whatsappReminders] = await Promise.all([
      processPendingNotificationJobs(80),
      processPendingAutomaticWhatsAppEvents(25),
      processDueWhatsAppReminders(20),
    ]);

    return NextResponse.json({
      ok: true,
      provider: "vercel-web-push-meta-whatsapp",
      recovery,
      push: result,
      whatsappAutomatic,
      whatsappReminders,
    });
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
