import { NextResponse } from "next/server";
import {
  AsaasWebhookUseCaseError,
  processarWebhookAsaasUseCase,
} from "@/core/use-cases/assinatura/webhook-asaas";
import { createAsaasWebhookService } from "@/services/asaasWebhookService";

export async function POST(req: Request) {
  try {
    const result = await processarWebhookAsaasUseCase({
      headers: req.headers,
      body: (await req.json()) as Record<string, unknown>,
      service: createAsaasWebhookService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AsaasWebhookUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Erro webhook" }, { status: 500 });
  }
}
