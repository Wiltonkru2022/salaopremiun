import { ZodError } from "zod";
import {
  parseProcessarEstoqueInput,
  processarEstoqueUseCase,
  ProcessarEstoqueUseCaseError,
} from "@/core/use-cases/estoque/processarEstoque";
import type { EstoqueService } from "@/services/estoqueService";
import {
  AuthzError,
  EstoqueMutacaoServiceError,
  PlanAccessError,
  type EstoqueMutacaoService,
} from "@/services/estoqueMutacaoService";

export class ProcessarEstoqueRouteUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public issues?: unknown
  ) {
    super(message);
    this.name = "ProcessarEstoqueRouteUseCaseError";
  }
}

export async function processarEstoqueRouteUseCase(params: {
  body: unknown;
  estoqueService: EstoqueService;
  mutacaoService: EstoqueMutacaoService;
}) {
  let idSalao = "";

  try {
    const input = parseProcessarEstoqueInput(params.body);
    idSalao = input.idSalao;

    const membership = await params.mutacaoService.validarPermissao(idSalao);
    await params.mutacaoService.validarPlano(idSalao);

    return await processarEstoqueUseCase({
      input,
      actorUserId: membership.usuario.id,
      service: params.estoqueService,
    });
  } catch (error) {
    if (idSalao) {
      await params.mutacaoService.reportarFalhaMovimentacao({
        idSalao,
        error,
      });
    }

    if (error instanceof ProcessarEstoqueRouteUseCaseError) {
      throw error;
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new ProcessarEstoqueRouteUseCaseError(
        firstIssue?.message || "Payload invalido.",
        400,
        undefined,
        error.flatten()
      );
    }

    if (error instanceof AuthzError) {
      throw new ProcessarEstoqueRouteUseCaseError(error.message, error.status);
    }

    if (error instanceof PlanAccessError) {
      throw new ProcessarEstoqueRouteUseCaseError(
        error.message,
        error.status,
        error.code
      );
    }

    if (error instanceof ProcessarEstoqueUseCaseError) {
      throw new ProcessarEstoqueRouteUseCaseError(error.message, error.status);
    }

    if (error instanceof EstoqueMutacaoServiceError) {
      throw new ProcessarEstoqueRouteUseCaseError(error.message, error.status);
    }

    throw new ProcessarEstoqueRouteUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao processar estoque.",
      500
    );
  }
}
