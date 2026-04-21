import {
  createSalaoTicket,
  getPainelTicketContext,
  getProfissionalTicketContext,
  getSalaoTicketDetail,
  listSalaoTickets,
  replySalaoTicket,
  updateSalaoTicketStatus,
} from "@/lib/support/tickets";

export function createSuporteTicketService() {
  return {
    getPainelContext() {
      return getPainelTicketContext();
    },

    getProfissionalContext() {
      return getProfissionalTicketContext();
    },

    listarTickets(idSalao: string) {
      return listSalaoTickets(idSalao);
    },

    criarTicket(params: Parameters<typeof createSalaoTicket>[0]) {
      return createSalaoTicket(params);
    },

    obterDetalhe(params: Parameters<typeof getSalaoTicketDetail>[0]) {
      return getSalaoTicketDetail(params);
    },

    responderTicket(params: Parameters<typeof replySalaoTicket>[0]) {
      return replySalaoTicket(params);
    },

    atualizarStatus(params: Parameters<typeof updateSalaoTicketStatus>[0]) {
      return updateSalaoTicketStatus(params);
    },
  };
}

export type SuporteTicketService = ReturnType<typeof createSuporteTicketService>;
