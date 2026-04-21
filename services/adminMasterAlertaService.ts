import {
  criarTicketPorAlertaAdminMaster,
  registrarAdminMasterAuditoria,
  resolverAlertaAdminMaster,
} from "@/lib/admin-master/actions";
import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { syncAdminMasterAlerts } from "@/lib/admin-master/alerts-sync";

export function createAdminMasterAlertaService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    sincronizarAlertas() {
      return syncAdminMasterAlerts();
    },

    resolverAlerta(params: Parameters<typeof resolverAlertaAdminMaster>[0]) {
      return resolverAlertaAdminMaster(params);
    },

    criarTicketPorAlerta(
      params: Parameters<typeof criarTicketPorAlertaAdminMaster>[0]
    ) {
      return criarTicketPorAlertaAdminMaster(params);
    },

    registrarAuditoria(params: Parameters<typeof registrarAdminMasterAuditoria>[0]) {
      return registrarAdminMasterAuditoria(params);
    },
  };
}

export type AdminMasterAlertaService = ReturnType<
  typeof createAdminMasterAlertaService
>;
