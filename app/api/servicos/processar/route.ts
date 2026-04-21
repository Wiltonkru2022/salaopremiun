import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseProcessarServicoInput,
  processarServicoUseCase,
  ProcessarServicoUseCaseError,
} from "@/core/use-cases/servicos/processarServico";
import { createServicoService } from "@/services/servicoService";
import {
  AuthzError,
  PlanAccessError,
  createSalaoMutacaoRouteService,
} from "@/services/salaoMutacaoRouteService";

const routeService = createSalaoMutacaoRouteService({
  permission: "servicos_ver",
  planFeature: "servicos",
  incidentKeyPrefix: "servicos:processar",
  module: "servicos",
  title: "Processamento de servico falhou",
  fallbackMessage: "Erro interno ao processar servico.",
  route: "/api/servicos/processar",
  getAction: (acaoRaw) =>
    ["salvar", "alterar_status", "excluir"].includes(acaoRaw) ? acaoRaw : null,
});

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const input = parseProcessarServicoInput(await req.json());
    idSalao = input.idSalao;
    acaoRaw = input.acao;

    await routeService.validar(idSalao);

    const result = await processarServicoUseCase({
      input,
      service: createServicoService(),
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

    if (error instanceof ProcessarServicoUseCaseError) {
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

    console.error("Erro geral ao processar servico:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar servico.",
      },
      { status: 500 }
    );
  }
}
