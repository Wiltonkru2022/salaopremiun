import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import { sendManualMarketingWhatsApp } from "@/services/marketingWhatsAppService";

type Body = {
  to?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const actor = await requireAdminTenantActor();
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

    const result = await sendManualMarketingWhatsApp({
      idSalao: actor.idSalao,
      destino: to,
      mensagem: message,
      tipo: "teste",
      tipoInterno: "marketing",
      idempotencyKey: request.headers.get("x-idempotency-key"),
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
