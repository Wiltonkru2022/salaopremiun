import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import {
  createWhatsappPacoteCheckoutService,
  WhatsappPacoteCheckoutServiceError,
} from "@/services/whatsappPacoteCheckoutService";

type Body = {
  pacoteId?: string;
  billingType?: "PIX" | "BOLETO";
};

export async function POST(req: Request) {
  try {
    await requireAdminTenantActor();
    const body = (await req.json()) as Body;
    const pacoteId = String(body.pacoteId || "").trim();

    if (!pacoteId) {
      return NextResponse.json(
        { error: "Pacote de WhatsApp obrigatorio." },
        { status: 400 }
      );
    }

    const result = await createWhatsappPacoteCheckoutService().criarCheckout({
      pacoteId,
      billingType: body.billingType || "PIX",
      idempotencyKey: req.headers.get("x-idempotency-key"),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof WhatsappPacoteCheckoutServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Erro interno ao criar checkout do pacote." },
      { status: 500 }
    );
  }
}
