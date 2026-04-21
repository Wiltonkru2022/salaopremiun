import { NextRequest, NextResponse } from "next/server";
import { createProfissionalAcessoService } from "@/services/profissionalAcessoService";
import { createProfissionalAcessoRouteService } from "@/services/profissionalAcessoRouteService";
import {
  SalvarProfissionalAcessoRouteUseCaseError,
  salvarProfissionalAcessoRouteUseCase,
} from "@/core/use-cases/profissionais-acessos/salvarProfissionalAcessoRoute";

export async function POST(req: NextRequest) {
  try {
    const acessoService = createProfissionalAcessoService();
    const result = await salvarProfissionalAcessoRouteUseCase({
      body: await req.json().catch(() => ({})),
      acessoService,
      routeService: createProfissionalAcessoRouteService({
        acessoService,
      }),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof SalvarProfissionalAcessoRouteUseCaseError) {
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
      { error: "Erro interno ao salvar acesso do profissional." },
      { status: 500 }
    );
  }
}
