import {
  ajustarVencimentoSalaoAdminMaster,
  bloquearSalaoAdminMaster,
  criarNotaSalaoAdminMaster,
  criarTicketSalaoAdminMaster,
  desbloquearSalaoAdminMaster,
  trocarPlanoSalaoAdminMaster,
} from "@/lib/admin-master/actions";
import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { getAdminMasterSaloes } from "@/lib/admin-master/data";

export function createAdminMasterSalaoService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    listarSaloes() {
      return getAdminMasterSaloes();
    },

    bloquearSalao(params: Parameters<typeof bloquearSalaoAdminMaster>[0]) {
      return bloquearSalaoAdminMaster(params);
    },

    desbloquearSalao(params: Parameters<typeof desbloquearSalaoAdminMaster>[0]) {
      return desbloquearSalaoAdminMaster(params);
    },

    trocarPlano(params: Parameters<typeof trocarPlanoSalaoAdminMaster>[0]) {
      return trocarPlanoSalaoAdminMaster(params);
    },

    ajustarVencimento(
      params: Parameters<typeof ajustarVencimentoSalaoAdminMaster>[0]
    ) {
      return ajustarVencimentoSalaoAdminMaster(params);
    },

    criarNota(params: Parameters<typeof criarNotaSalaoAdminMaster>[0]) {
      return criarNotaSalaoAdminMaster(params);
    },

    criarTicket(params: Parameters<typeof criarTicketSalaoAdminMaster>[0]) {
      return criarTicketSalaoAdminMaster(params);
    },
  };
}

export type AdminMasterSalaoService = ReturnType<
  typeof createAdminMasterSalaoService
>;
