import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  processDueWhatsAppReminders,
  processPendingAutomaticWhatsAppEvents,
} from "@/lib/whatsapp/automatic-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function isAuthorized(request: Request) {
  const provided = String(
    request.headers.get("x-whatsapp-automation-secret") || ""
  ).trim();
  const expected = String(
    process.env.WHATSAPP_AUTOMATION_WORKER_SECRET ||
      process.env.WHATSAPP_AUTOMATION_SECRET ||
      ""
  ).trim();

  if (!provided || !expected || provided.length > 256 || expected.length > 256) {
    return false;
  }

  return safeEqual(provided, expected);
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const [automaticEvents, reminders] = await Promise.all([
      processPendingAutomaticWhatsAppEvents(25),
      processDueWhatsAppReminders(20),
    ]);

    return NextResponse.json({
      ok: true,
      automaticEvents,
      reminders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar automacoes WhatsApp.",
      },
      { status: 500 }
    );
  }
}
