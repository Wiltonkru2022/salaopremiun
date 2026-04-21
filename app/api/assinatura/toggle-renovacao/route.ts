import { NextResponse } from "next/server";
import {
  AssinaturaUseCaseError,
  toggleRenovacaoAssinaturaUseCase,
} from "@/core/use-cases/assinatura/operacoes";
import { createAssinaturaService } from "@/services/assinaturaService";

export async function POST(req: Request) {
  try {
    const result = await toggleRenovacaoAssinaturaUseCase({
      body: await req.json().catch(() => null),
      service: createAssinaturaService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AssinaturaUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao alterar renovacao automatica.",
      },
      { status: 500 }
    );
  }
}
