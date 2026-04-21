import {
  getAdminMasterPlanosSection,
  getAdminMasterRecursosSection,
} from "@/lib/admin-master/data";
import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";

export function createAdminMasterPlanoService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    listarPlanos() {
      return getAdminMasterPlanosSection();
    },

    listarRecursos() {
      return getAdminMasterRecursosSection();
    },
  };
}

export type AdminMasterPlanoService = ReturnType<
  typeof createAdminMasterPlanoService
>;
