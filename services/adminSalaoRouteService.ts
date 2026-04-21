import { requireAdminSalao } from "@/lib/auth/require-admin-salao";
import { AuthzError } from "@/lib/auth/require-admin-salao";

export function createAdminSalaoRouteService() {
  return {
    async validarAdmin(idSalao: string) {
      return requireAdminSalao(idSalao);
    },
  };
}

export { AuthzError };
