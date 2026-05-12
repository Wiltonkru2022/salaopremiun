import { requireAdminSalao } from "@/lib/auth/require-admin-salao";
import { AuthzError } from "@/lib/auth/require-admin-salao";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
  type PlanoRecursoCodigo,
} from "@/lib/plans/access";

export function createAdminSalaoRouteService() {
  return {
    async validarAdmin(idSalao: string) {
      return requireAdminSalao(idSalao);
    },

    async validarAdminComRecurso(
      idSalao: string,
      recurso: PlanoRecursoCodigo
    ) {
      const membership = await requireAdminSalao(idSalao);
      await assertCanMutatePlanFeature(idSalao, recurso);
      return membership;
    },
  };
}

export { AuthzError, PlanAccessError };
