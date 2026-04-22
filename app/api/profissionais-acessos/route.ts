import { NextRequest, NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import { createProfissionalAcessoService } from "@/services/profissionalAcessoService";
import { createProfissionalAcessoRouteService } from "@/services/profissionalAcessoRouteService";
import {
  SalvarProfissionalAcessoRouteUseCaseError,
  salvarProfissionalAcessoRouteUseCase,
} from "@/core/use-cases/profissionais-acessos/salvarProfissionalAcessoRoute";

export async function POST(req: NextRequest) {
  try {
    await requireAdminTenantActor();

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

    if (
      error instanceof Error &&
      (error.message.includes("Apenas administradores") ||
        error.message.includes("Sessao invalida") ||
        error.message.includes("Usuario inativo"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro interno ao salvar acesso do profissional." },
      { status: 500 }
    );
  }
}
