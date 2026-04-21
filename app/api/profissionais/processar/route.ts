import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseProcessarProfissionalInput,
  processarProfissionalUseCase,
  ProcessarProfissionalUseCaseError,
} from "@/core/use-cases/profissionais/processarProfissional";
import { createProfissionalService } from "@/services/profissionalService";
import {
  AuthzError,
  PlanAccessError,
  createSalaoMutacaoRouteService,
} from "@/services/salaoMutacaoRouteService";

const routeService = createSalaoMutacaoRouteService({
  permission: "profissionais_ver",
  planFeature: "profissionais",
  incidentKeyPrefix: "profissionais:processar",
  module: "profissionais",
  title: "Processamento de profissional falhou",
  fallbackMessage: "Erro interno ao salvar profissional.",
  route: "/api/profissionais/processar",
  getAction: (acaoRaw) => acaoRaw || null,
});

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const input = parseProcessarProfissionalInput(await req.json());
    idSalao = input.idSalao;
    acaoRaw = input.acao;

    await routeService.validar(idSalao);

    const result = await processarProfissionalUseCase({
      input,
      service: createProfissionalService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || "Payload invalido.",
          issues: error.flatten(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof ProcessarProfissionalUseCaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      await routeService.reportarFalha({
        idSalao,
        acaoRaw,
        error,
      });
    }

    console.error("ERRO API PROFISSIONAIS PROCESSAR:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar profissional." },
      { status: 500 }
    );
  }
}
