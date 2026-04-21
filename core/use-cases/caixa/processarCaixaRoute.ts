import { ZodError } from "zod";
import { AuthzError } from "@/lib/auth/require-salao-permission";
import { CaixaInputError } from "@/lib/caixa/processar/utils";
import { PlanAccessError } from "@/lib/plans/access";
import {
  parseProcessarCaixaInput,
  processarCaixaUseCase,
  ProcessarCaixaUseCaseError,
} from "@/core/use-cases/caixa/processarCaixa";
import type { CaixaService } from "@/services/caixaService";
import type { CaixaRouteService } from "@/services/caixaRouteService";

export class ProcessarCaixaRouteUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public issues?: unknown
  ) {
    super(message);
    this.name = "ProcessarCaixaRouteUseCaseError";
  }
}

export async function processarCaixaRouteUseCase(params: {
  body: unknown;
  caixaService: CaixaService;
  routeService: CaixaRouteService;
}) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const input = parseProcessarCaixaInput(params.body);
    idSalao = input.idSalao;
    acaoRaw = input.acao;

    return await processarCaixaUseCase({
      input,
      service: params.caixaService,
    });
  } catch (error) {
    if (idSalao) {
      await params.routeService.reportarFalhaProcessamento({
        idSalao,
        acaoRaw,
        error,
      });
    }

    if (error instanceof ProcessarCaixaRouteUseCaseError) {
      throw error;
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new ProcessarCaixaRouteUseCaseError(
        firstIssue?.message || "Payload invalido.",
        400,
        undefined,
        error.flatten()
      );
    }

    if (error instanceof AuthzError) {
      throw new ProcessarCaixaRouteUseCaseError(
        error.message,
        error.status,
        error.code
      );
    }

    if (error instanceof PlanAccessError) {
      throw new ProcessarCaixaRouteUseCaseError(
        error.message,
        error.status,
        error.code
      );
    }

    if (error instanceof CaixaInputError) {
      throw new ProcessarCaixaRouteUseCaseError(error.message, error.status);
    }

    if (error instanceof ProcessarCaixaUseCaseError) {
      throw new ProcessarCaixaRouteUseCaseError(error.message, error.status);
    }

    throw new ProcessarCaixaRouteUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao processar acao do caixa.",
      params.routeService.resolveStatus(error)
    );
  }
}
