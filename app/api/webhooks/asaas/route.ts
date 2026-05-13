import { NextResponse } from "next/server";
import {
  AsaasWebhookUseCaseError,
  processarWebhookAsaasUseCase,
} from "@/core/use-cases/assinatura/webhook-asaas";
import { processAsaasWebhookOnOracleVps } from "@/lib/oracle-vps/client";
import { createAsaasWebhookService } from "@/services/asaasWebhookService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const oracleResult = await processAsaasWebhookOnOracleVps(body);

    if (oracleResult.ok) {
      return NextResponse.json(
        {
          ok: true,
          provider: "oracle-vps",
          result: oracleResult.result,
        },
        { status: 200 }
      );
    }

    const result = await processarWebhookAsaasUseCase({
      headers: req.headers,
      body,
      service: createAsaasWebhookService(),
    });

    return NextResponse.json(
      {
        ...result.body,
        provider: "vercel-fallback",
        oracleError: oracleResult.error || null,
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
