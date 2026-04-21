import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  replyAdminTicket,
  updateAdminTicketStatus,
} from "@/lib/support/tickets";

export function createAdminMasterTicketService() {
  return {
    requireAdmin() {
      return requireAdminMasterUser("tickets_ver");
    },

    responderTicket(params: Parameters<typeof replyAdminTicket>[0]) {
      return replyAdminTicket(params);
    },

    atualizarStatus(params: Parameters<typeof updateAdminTicketStatus>[0]) {
      return updateAdminTicketStatus(params);
    },

    registrarAuditoria(params: Parameters<typeof registrarAdminMasterAuditoria>[0]) {
      return registrarAdminMasterAuditoria(params);
    },
  };
}

export type AdminMasterTicketService = ReturnType<
  typeof createAdminMasterTicketService
>;
