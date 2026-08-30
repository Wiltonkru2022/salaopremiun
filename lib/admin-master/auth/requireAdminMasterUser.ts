import { redirect } from "next/navigation";
import type {
  AdminMasterPermissions,
  AdminMasterPermissionKey,
} from "@/lib/admin-master/auth/adminMasterPermissions";
import { ADMIN_MASTER_LOGIN_PATH } from "@/lib/admin-master/auth/login-path";
import { readAdminMasterSession } from "@/lib/admin-master/auth/session";
import { resolveAdminMasterSessionAccess } from "@/lib/admin-master/auth/password-access-neon.server";

export class AdminMasterAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AdminMasterAuthError";
    this.status = status;
  }
}

type AdminMasterUsuarioRow = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
};

type AdminMasterIdentity = {
  id: string;
  email?: string | null;
  nome?: string | null;
};

type AdminMasterAuthUser = {
  id: string;
  email: string;
  user_metadata: { nome: string };
};

type AdminMasterAccessAllowed = {
  ok: true;
  authUser: AdminMasterAuthUser;
  usuario: AdminMasterUsuarioRow;
  permissions: AdminMasterPermissions;
};

type AdminMasterAccessDenied = {
  ok: false;
  status: number;
  message: string;
};

export type AdminMasterAccessResult = AdminMasterAccessAllowed | AdminMasterAccessDenied;

function errorStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const value = Number((error as { status?: unknown }).status || 500);
    if ([400, 401, 403, 404, 409, 422, 500].includes(value)) return value;
  }
  return 500;
}

/**
 * Compatibilidade para chamadas internas que já possuem identidade.
 * Também usa SQL direto no Neon; não passa mais pelo adapter painel-query.server.ts.
 */
export async function resolveAdminMasterAccessForIdentity(
  identity: AdminMasterIdentity,
  permission: AdminMasterPermissionKey = "dashboard_ver",
): Promise<AdminMasterAccessResult> {
  const email = String(identity.email || "").trim().toLowerCase();
  if (!email) {
    return { ok: false, status: 403, message: "Usuário Admin Master sem e-mail válido." };
  }

  try {
    const access = await resolveAdminMasterSessionAccess({
      email,
      authUserId: String(identity.id || "").trim(),
      permission,
    });

    return {
      ok: true,
      authUser: {
        id: access.authUserId,
        email: access.email,
        user_metadata: { nome: access.nome },
      },
      usuario: {
        id: access.id,
        nome: access.nome,
        email: access.email,
        perfil: access.perfil,
        status: "ativo",
      },
      permissions: access.permissions,
    };
  } catch (error) {
    return {
      ok: false,
      status: errorStatus(error),
      message: error instanceof Error ? error.message : "Erro ao validar Admin Master.",
    };
  }
}

/**
 * Validação usada por todas as páginas /admin-master após o login.
 * A sessão HttpOnly fornece authUserId/e-mail e a consulta vai direto ao Neon.
 */
export async function getAdminMasterAccess(
  permission: AdminMasterPermissionKey = "dashboard_ver",
): Promise<AdminMasterAccessResult> {
  const session = await readAdminMasterSession();
  if (!session) {
    return {
      ok: false,
      status: 401,
      message: "Sessão expirada. Faça login novamente no Admin Master.",
    };
  }

  return resolveAdminMasterAccessForIdentity(
    { id: session.authUserId, email: session.email },
    permission,
  );
}

export async function requireAdminMasterUser(
  permission: AdminMasterPermissionKey = "dashboard_ver",
) {
  const result = await getAdminMasterAccess(permission);
  if (!result.ok) {
    if (result.status === 401) redirect(ADMIN_MASTER_LOGIN_PATH);
    throw new AdminMasterAuthError(result.message, result.status);
  }
  return result;
}
