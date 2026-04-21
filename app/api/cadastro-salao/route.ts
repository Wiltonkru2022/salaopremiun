import { NextResponse } from "next/server";
import {
  CadastroSalaoUseCaseError,
  cadastrarSalaoUseCase,
} from "@/core/use-cases/cadastro-salao/cadastrarSalao";
import { createCadastroSalaoService } from "@/services/cadastroSalaoService";

export async function POST(req: Request) {
  try {
    const result = await cadastrarSalaoUseCase({
      body: await req.json().catch(() => null),
      service: createCadastroSalaoService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof CadastroSalaoUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno no cadastro.",
      },
      { status: 500 }
    );
  }
}
