import { NextResponse } from "next/server";
import {
  AsaasWebhookUseCaseError,
  processarWebhookAsaasUseCase,
} from "@/core/use-cases/assinatura/webhook-asaas";
import { mirrorAsaasWebhookToOracleVps } from "@/lib/oracle-vps/client";
import { createAsaasWebhookService } from "@/services/asaasWebhookService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const result = await processarWebhookAsaasUseCase({
      headers: req.headers,
      body,
      service: createAsaasWebhookService(),
    });

    await mirrorAsaasWebhookToOracleVps({
      event: body.event || null,
      paymentId:
        body.payment && typeof body.payment === "object"
          ? String((body.payment as Record<string, unknown>).id || "")
          : null,
      status: result.status,
      body,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AsaasWebhookUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Erro webhook" }, { status: 500 });
  }
}
