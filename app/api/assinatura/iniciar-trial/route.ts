import { NextResponse } from "next/server";
import {
  AssinaturaUseCaseError,
  iniciarTrialAssinaturaUseCase,
} from "@/core/use-cases/assinatura/operacoes";
import { createAssinaturaService } from "@/services/assinaturaService";

export async function POST(req: Request) {
  try {
    const result = await iniciarTrialAssinaturaUseCase({
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
            : "Erro interno ao iniciar trial.",
      },
      { status: 500 }
    );
  }
}
