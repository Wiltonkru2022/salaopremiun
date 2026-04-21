import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

export function createAdminMasterAuthService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    resolveRedirectTo(nextPath: string | null) {
      return sanitizeAdminMasterNextPath(nextPath) || ADMIN_MASTER_HOME_PATH;
    },
  };
}

export type AdminMasterAuthService = ReturnType<
  typeof createAdminMasterAuthService
>;
