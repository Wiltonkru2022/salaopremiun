import { ZodError } from "zod";
import { PlanAccessError } from "@/lib/plans/access";
import { UsuarioUseCaseError } from "@/core/use-cases/usuarios/shared";
import { AuthzError } from "@/services/adminSalaoRouteService";

export class UsuarioRouteUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public issues?: unknown
  ) {
    super(message);
    this.name = "UsuarioRouteUseCaseError";
  }
}

export function mapUsuarioRouteError(
  error: unknown,
  fallback: string
): never {
  if (error instanceof UsuarioRouteUseCaseError) {
    throw error;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    throw new UsuarioRouteUseCaseError(
      firstIssue?.message || "Payload invalido.",
      400,
      undefined,
      error.flatten()
    );
  }

  if (error instanceof AuthzError) {
    throw new UsuarioRouteUseCaseError(error.message, error.status);
  }

  if (error instanceof PlanAccessError) {
    throw new UsuarioRouteUseCaseError(error.message, error.status, error.code);
  }

  if (error instanceof UsuarioUseCaseError) {
    throw new UsuarioRouteUseCaseError(error.message, error.status);
  }

  throw new UsuarioRouteUseCaseError(fallback, 500);
}
