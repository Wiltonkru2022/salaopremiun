import { NextResponse } from "next/server";
import {
  AssinaturaCheckoutUseCaseError,
  criarCobrancaAssinaturaUseCase,
} from "@/core/use-cases/assinatura/criar-cobranca";
import {
  createAssinaturaCheckoutService,
  getCheckoutIdempotencyKeyFromHeaders,
} from "@/services/assinaturaCheckoutService";

export async function POST(req: Request) {
  try {
    const result = await criarCobrancaAssinaturaUseCase({
      body: await req.json().catch(() => null),
      idempotencyKey: getCheckoutIdempotencyKeyFromHeaders(req.headers),
      service: createAssinaturaCheckoutService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AssinaturaCheckoutUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar cobranca.",
      },
      { status: 500 }
    );
  }
}
