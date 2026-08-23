import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import {
  criarWhatsappCreditosCheckout,
  WhatsAppCreditosServiceError,
} from "@/services/whatsappCreditosService";

type Body = {
  valorCentavos?: number;
  billingType?: "PIX" | "BOLETO";
};

export async function POST(request: Request) {
  try {
    const actor = await requireAdminTenantActor();
    const body = (await request.json()) as Body;
    const valorCentavos = Math.trunc(Number(body.valorCentavos || 0));

    if (!valorCentavos) {
      return NextResponse.json(
        { error: "Valor da recarga obrigatorio." },
        { status: 400 }
      );
    }

    const result = await criarWhatsappCreditosCheckout({
      idSalao: actor.idSalao,
      valorCentavos,
      billingType: body.billingType || "PIX",
      idempotencyKey: request.headers.get("x-idempotency-key"),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof WhatsAppCreditosServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar recarga WhatsApp.",
      },
      { status: 500 }
    );
  }
}
