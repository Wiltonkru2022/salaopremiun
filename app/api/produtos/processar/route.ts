import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseProcessarProdutoInput,
  processarProdutoUseCase,
  ProcessarProdutoUseCaseError,
} from "@/core/use-cases/produtos/processarProduto";
import { createProdutoService } from "@/services/produtoService";
import {
  AuthzError,
  PlanAccessError,
  createSalaoMutacaoRouteService,
} from "@/services/salaoMutacaoRouteService";

const routeService = createSalaoMutacaoRouteService({
  permission: "produtos_ver",
  planFeature: "produtos",
  incidentKeyPrefix: "produtos:processar",
  module: "produtos",
  title: "Processamento de produto falhou",
  fallbackMessage: "Erro interno ao processar produto.",
  route: "/api/produtos/processar",
  getAction: (acaoRaw) =>
    ["salvar", "alterar_status", "excluir"].includes(acaoRaw) ? acaoRaw : null,
});

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const input = parseProcessarProdutoInput(await req.json());
    idSalao = input.idSalao;
    acaoRaw = input.acao;

    await routeService.validar(idSalao);

    const result = await processarProdutoUseCase({
      input,
      service: createProdutoService(),
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

    if (error instanceof ProcessarProdutoUseCaseError) {
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

    console.error("Erro geral ao processar produto:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar produto.",
      },
      { status: 500 }
    );
  }
}
