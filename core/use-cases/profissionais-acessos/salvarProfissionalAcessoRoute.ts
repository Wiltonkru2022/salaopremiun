import { ZodError } from "zod";
import {
  parseSalvarProfissionalAcessoInput,
  salvarProfissionalAcessoUseCase,
  SalvarProfissionalAcessoUseCaseError,
} from "@/core/use-cases/profissionais-acessos/salvarProfissionalAcesso";
import type { ProfissionalAcessoService } from "@/services/profissionalAcessoService";
import {
  AuthzError,
  PlanAccessError,
  ProfissionalAcessoRouteServiceError,
  type createProfissionalAcessoRouteService,
} from "@/services/profissionalAcessoRouteService";

type ProfissionalAcessoRouteService = ReturnType<
  typeof createProfissionalAcessoRouteService
>;

export class SalvarProfissionalAcessoRouteUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public issues?: unknown
  ) {
    super(message);
    this.name = "SalvarProfissionalAcessoRouteUseCaseError";
  }
}

export async function salvarProfissionalAcessoRouteUseCase(params: {
  body: unknown;
  acessoService: ProfissionalAcessoService;
  routeService: ProfissionalAcessoRouteService;
}) {
  try {
    const input = parseSalvarProfissionalAcessoInput(params.body);
    await params.routeService.validarAdminDoSalao(input.idProfissional);

    return await salvarProfissionalAcessoUseCase({
      input,
      service: params.acessoService,
    });
  } catch (error) {
    if (error instanceof SalvarProfissionalAcessoRouteUseCaseError) {
      throw error;
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new SalvarProfissionalAcessoRouteUseCaseError(
        firstIssue?.message || "Payload invalido.",
        400,
        undefined,
        error.flatten()
      );
    }

    if (error instanceof AuthzError) {
      throw new SalvarProfissionalAcessoRouteUseCaseError(
        error.message,
        error.status
      );
    }

    if (error instanceof PlanAccessError) {
      throw new SalvarProfissionalAcessoRouteUseCaseError(
        error.message,
        error.status,
        error.code
      );
    }

    if (error instanceof SalvarProfissionalAcessoUseCaseError) {
      throw new SalvarProfissionalAcessoRouteUseCaseError(
        error.message,
        error.status
      );
    }

    if (error instanceof ProfissionalAcessoRouteServiceError) {
      throw new SalvarProfissionalAcessoRouteUseCaseError(
        error.message,
        error.status,
        error.code
      );
    }

    console.error("[PROFISSIONAL_ACESSO_ROUTE_ERROR]", {
      error: error instanceof Error ? error.message : "erro_desconhecido",
    });

    throw new SalvarProfissionalAcessoRouteUseCaseError(
      "Erro interno ao salvar acesso do profissional.",
      500
    );
  }
}
