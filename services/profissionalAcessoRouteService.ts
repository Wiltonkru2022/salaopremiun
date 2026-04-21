import { requireAdminSalao } from "@/lib/auth/require-admin-salao";
import { AuthzError } from "@/lib/auth/require-salao-membership";
import { PlanAccessError } from "@/lib/plans/access";
import type { ProfissionalAcessoService } from "@/services/profissionalAcessoService";

export class ProfissionalAcessoRouteServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ProfissionalAcessoRouteServiceError";
  }
}

export function createProfissionalAcessoRouteService(params: {
  acessoService: ProfissionalAcessoService;
}) {
  return {
    async validarAdminDoSalao(idProfissional: string) {
      const profissional = await params.acessoService.buscarProfissional(idProfissional);

      if (!profissional?.id_salao) {
        throw new ProfissionalAcessoRouteServiceError(
          "Profissional nao encontrado.",
          404
        );
      }

      await requireAdminSalao(String(profissional.id_salao));
      return profissional;
    },
  };
}

export { AuthzError, PlanAccessError };
