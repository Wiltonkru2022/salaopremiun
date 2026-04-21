import { z } from "zod";
import type { AdminMasterTicketService } from "@/services/adminMasterTicketService";

const ticketStatusSchema = z.enum([
  "aberto",
  "em_atendimento",
  "aguardando_cliente",
  "aguardando_tecnico",
  "resolvido",
  "fechado",
]);

const ticketPrioridadeSchema = z.enum(["baixa", "media", "alta", "critica"]);

const responderTicketSchema = z.object({
  mensagem: z.string().trim().min(1, "Digite a mensagem para responder o ticket."),
  status: ticketStatusSchema.nullable().optional(),
  assumir: z.boolean().optional(),
});

const atualizarStatusSchema = z.object({
  status: ticketStatusSchema.default("em_atendimento"),
  prioridade: ticketPrioridadeSchema.nullable().optional(),
  motivo: z.string().trim().nullable().optional(),
  assumir: z.boolean().optional(),
});

export class AdminMasterTicketUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterTicketUseCaseError";
  }
}

function mapTicketError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "INVALID_PAYLOAD") {
    return new AdminMasterTicketUseCaseError(
      "Digite a mensagem para responder o ticket.",
      400
    );
  }

  if (message === "NOT_FOUND") {
    return new AdminMasterTicketUseCaseError("Ticket nao encontrado.", 404);
  }

  if (message === "UNAUTHORIZED") {
    return new AdminMasterTicketUseCaseError("Sessao invalida.", 401);
  }

  return new AdminMasterTicketUseCaseError(message || fallback, 500);
}

async function requireTicketsEditPermission(service: AdminMasterTicketService) {
  const admin = await service.requireAdmin();

  if (!admin.permissions.tickets_editar) {
    throw new AdminMasterTicketUseCaseError(
      "Usuario sem permissao para atualizar tickets.",
      403
    );
  }

  return admin;
}

export async function responderAdminMasterTicketUseCase(params: {
  idTicket: string;
  body: unknown;
  service: AdminMasterTicketService;
}) {
  try {
    const admin = await requireTicketsEditPermission(params.service);
    const input = responderTicketSchema.parse(params.body);
    const assumir = input.assumir ?? true;
    const result = await params.service.responderTicket({
      context: {
        origem: "admin_master",
        idAdmin: admin.usuario.id,
        nome: admin.usuario.nome,
      },
      idTicket: params.idTicket,
      mensagem: input.mensagem,
      status: input.status || null,
      assumir,
    });

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "responder_ticket",
      entidade: "tickets",
      entidadeId: params.idTicket,
      descricao: "Resposta enviada no atendimento do AdminMaster.",
      payload: {
        status: result.status,
        assumir,
      },
    });

    return {
      status: 200,
      body: {
        ok: true,
        result,
      },
    };
  } catch (error) {
    if (error instanceof AdminMasterTicketUseCaseError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new AdminMasterTicketUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapTicketError(error, "Erro ao responder ticket.");
  }
}

export async function atualizarAdminMasterTicketStatusUseCase(params: {
  idTicket: string;
  body: unknown;
  service: AdminMasterTicketService;
}) {
  try {
    const admin = await requireTicketsEditPermission(params.service);
    const input = atualizarStatusSchema.parse(params.body);
    const assumir = input.assumir ?? true;
    const result = await params.service.atualizarStatus({
      context: {
        origem: "admin_master",
        idAdmin: admin.usuario.id,
        nome: admin.usuario.nome,
      },
      idTicket: params.idTicket,
      status: input.status,
      prioridade: input.prioridade || null,
      motivo: input.motivo || null,
      assumir,
    });

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "atualizar_ticket",
      entidade: "tickets",
      entidadeId: params.idTicket,
      descricao: input.motivo || "Status do ticket ajustado no AdminMaster.",
      payload: {
        status: result.status,
        prioridade: result.prioridade,
        assumir,
      },
    });

    return {
      status: 200,
      body: {
        ok: true,
        result,
      },
    };
  } catch (error) {
    if (error instanceof AdminMasterTicketUseCaseError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new AdminMasterTicketUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapTicketError(error, "Erro ao atualizar ticket.");
  }
}
