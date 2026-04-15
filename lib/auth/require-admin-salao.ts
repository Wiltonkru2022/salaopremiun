import {
  AuthzError,
  requireSalaoMembership,
} from "@/lib/auth/require-salao-membership";

export { AuthzError };

export async function requireAdminSalao(idSalao: string) {
  try {
    return await requireSalaoMembership(idSalao, {
      allowedNiveis: ["admin"],
    });
  } catch (error) {
    if (error instanceof AuthzError && error.status === 403) {
      throw new AuthzError("Somente administrador pode executar esta acao.", 403);
    }

    throw error;
  }
}
