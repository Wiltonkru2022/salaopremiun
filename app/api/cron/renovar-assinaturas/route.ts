import { NextResponse } from "next/server";
import {
  AssinaturaCronUseCaseError,
  executarCronRenovacaoAssinaturasUseCase,
} from "@/core/use-cases/assinatura/cron-renovacao";
import { createAssinaturaCronService } from "@/services/assinaturaCronService";

async function handleCron(req: Request) {
  try {
    const result = await executarCronRenovacaoAssinaturasUseCase({
      authorizationHeader: req.headers.get("authorization"),
      service: createAssinaturaCronService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AssinaturaCronUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao renovar assinaturas.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
