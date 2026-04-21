import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { getAdminMasterDashboard } from "@/lib/admin-master/data";

export function createAdminMasterDashboardService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    carregarDashboard() {
      return getAdminMasterDashboard();
    },
  };
}

export type AdminMasterDashboardService = ReturnType<
  typeof createAdminMasterDashboardService
>;
