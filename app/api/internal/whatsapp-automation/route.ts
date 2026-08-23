import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  processDueWhatsAppReminders,
  processPendingAutomaticWhatsAppEvents,
} from "@/lib/whatsapp/automatic-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: Request) {
  const secret = String(request.headers.get("x-whatsapp-automation-secret") || "").trim();
  if (!secret || secret.length > 256) return false;

  const { data, error } = await (getSupabaseAdmin() as any).rpc(
    "fn_whatsapp_automation_secret_valid",
    { p_secret: secret }
  );

  return !error && data === true;
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
