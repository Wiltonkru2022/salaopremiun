import { NextRequest, NextResponse } from "next/server";
import { createCaixaService } from "@/services/caixaService";
import { createCaixaRouteService } from "@/services/caixaRouteService";
import {
  ProcessarCaixaRouteUseCaseError,
  processarCaixaRouteUseCase,
} from "@/core/use-cases/caixa/processarCaixaRoute";

export async function POST(req: NextRequest) {
  try {
    const result = await processarCaixaRouteUseCase({
      body: await req.json().catch(() => ({})),
      caixaService: createCaixaService(),
      routeService: createCaixaRouteService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ProcessarCaixaRouteUseCaseError) {
      return NextResponse.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
          ...(error.issues ? { issues: error.issues } : {}),
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar acao do caixa.",
      },
      { status: 500 }
    );
  }
}
