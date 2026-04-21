import { NextRequest, NextResponse } from "next/server";
import { createEstoqueService } from "@/services/estoqueService";
import { createEstoqueMutacaoService } from "@/services/estoqueMutacaoService";
import {
  ProcessarEstoqueRouteUseCaseError,
  processarEstoqueRouteUseCase,
} from "@/core/use-cases/estoque/processarEstoqueRoute";

export async function POST(req: NextRequest) {
  try {
    const result = await processarEstoqueRouteUseCase({
      body: await req.json().catch(() => ({})),
      estoqueService: createEstoqueService(),
      mutacaoService: createEstoqueMutacaoService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ProcessarEstoqueRouteUseCaseError) {
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
            : "Erro interno ao processar estoque.",
      },
      { status: 500 }
    );
  }
}
