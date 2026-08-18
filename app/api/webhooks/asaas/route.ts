import { NextResponse } from "next/server";
import {
  AsaasWebhookUseCaseError,
  processarWebhookAsaasUseCase,
} from "@/core/use-cases/assinatura/webhook-asaas";
import { createAsaasWebhookService } from "@/services/asaasWebhookService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const service = createAsaasWebhookService();

    if (!service.validarTokenWebhook(req.headers)) {
      throw new AsaasWebhookUseCaseError("Webhook não autorizado.", 401);
    }

    const result = await processarWebhookAsaasUseCase({
      headers: req.headers,
      body,
      service,
    });

    return NextResponse.json(
      {
        ...result.body,
        provider: "vercel",
      },
      { status: result.status }
    );
  } catch (error) {
    if (error instanceof AsaasWebhookUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Erro webhook" }, { status: 500 });
  }
}
