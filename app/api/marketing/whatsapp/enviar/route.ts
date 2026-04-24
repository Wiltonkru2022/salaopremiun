import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import { sendManualMarketingWhatsApp } from "@/services/marketingWhatsAppService";

type Body = {
  to?: string;
  message?: string;
  template?: string | null;
};

export async function POST(request: Request) {
  try {
    const actor = await requireAdminTenantActor();
    const body = (await request.json()) as Body;
    const to = String(body.to || "").trim();
    const message = String(body.message || "").trim();
    const template = body.template ? String(body.template).trim() : null;

    if (!to) {
      return NextResponse.json(
        { error: "Numero de destino obrigatorio." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Mensagem obrigatoria." },
        { status: 400 }
      );
    }

    const result = await sendManualMarketingWhatsApp({
      idSalao: actor.idSalao,
      destino: to,
      mensagem: message,
      tipo: "manual_marketing",
      template,
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar mensagem WhatsApp.",
      },
      { status: 500 }
    );
  }
}
