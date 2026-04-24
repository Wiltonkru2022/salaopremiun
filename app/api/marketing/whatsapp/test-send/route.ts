import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import { sendMetaWhatsAppTextMessage } from "@/lib/whatsapp/meta-cloud";

type Body = {
  to?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    await requireAdminTenantActor();
    const body = (await request.json()) as Body;
    const to = String(body.to || "").trim();
    const message = String(body.message || "").trim();

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

    const result = await sendMetaWhatsAppTextMessage({
      to,
      body: message,
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar mensagem de teste.",
      },
      { status: 500 }
    );
  }
}
