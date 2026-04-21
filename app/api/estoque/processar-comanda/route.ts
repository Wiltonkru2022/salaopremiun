import { NextRequest, NextResponse } from "next/server";
import {
  EstoqueComandaUseCaseError,
  processarEstoqueComandaUseCase,
} from "@/core/use-cases/estoque/comanda";
import { createEstoqueComandaService } from "@/services/estoqueComandaService";

export async function POST(req: NextRequest) {
  try {
    const result = await processarEstoqueComandaUseCase({
      body: await req.json().catch(() => null),
      service: createEstoqueComandaService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof EstoqueComandaUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar o estoque da comanda.",
      },
      { status: 500 }
    );
  }
}
