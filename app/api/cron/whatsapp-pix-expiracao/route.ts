import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { expireWhatsappPixRecargas } from "@/lib/whatsapp-creditos/expire-pix";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const result = await expireWhatsappPixRecargas({ limit: 50 });
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao expirar PIX WhatsApp.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
