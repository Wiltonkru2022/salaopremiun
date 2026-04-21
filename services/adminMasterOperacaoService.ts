import { criarTicketPorCheckoutLockAdminMaster } from "@/lib/admin-master/actions";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { syncAdminMasterAlerts } from "@/lib/admin-master/alerts-sync";
import { syncAdminMasterWebhookEvents } from "@/lib/admin-master/webhooks-sync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export function createAdminMasterOperacaoService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    criarTicketPorCheckout(
      params: Parameters<typeof criarTicketPorCheckoutLockAdminMaster>[0]
    ) {
      return criarTicketPorCheckoutLockAdminMaster(params);
    },

    sincronizarWebhooks() {
      return syncAdminMasterWebhookEvents();
    },

    sincronizarAlertas() {
      return syncAdminMasterAlerts();
    },

    registrarAuditoria(params: Parameters<typeof registrarAdminMasterAuditoria>[0]) {
      return registrarAdminMasterAuditoria(params);
    },

    async avaliarExtensaoTrial(idSalao: string | null) {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.rpc(
        "fn_admin_master_avaliar_extensao_trial",
        {
          p_id_salao: idSalao,
        }
      );

      if (error) {
        throw new Error(error.message || "Erro ao avaliar extensao de trial.");
      }

      return data;
    },
  };
}

export type AdminMasterOperacaoService = ReturnType<
  typeof createAdminMasterOperacaoService
>;
