import { z } from "zod";
import type { SuporteTicketService } from "@/services/suporteTicketService";

const createTicketSchema = z.object({
  assunto: z.string().trim().min(1, "Preencha assunto e mensagem do ticket."),
  categoria: z.string().nullable().optional(),
  prioridade: z.string().nullable().optional(),
  mensagem: z.string().trim().min(1, "Preencha assunto e mensagem do ticket."),
  contexto: z.record(z.string(), z.unknown()).optional().default({}),
});

const replyTicketSchema = z.object({
  mensagem: z.string().trim().min(1, "Digite a mensagem para responder o ticket."),
});

const attachmentTicketSchema = z.object({
  bytes: z.instanceof(Uint8Array),
  contentType: z.string().trim().min(1, "Arquivo invalido."),
  fileName: z.string().trim().min(1, "Arquivo invalido."),
  mensagem: z.string().trim().nullable().optional(),
});

const statusTicketSchema = z.object({
  status: z.enum(["aberto", "fechado"]).default("aberto"),
  motivo: z.string().nullable().optional(),
});

export class SuporteTicketUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SuporteTicketUseCaseError";
  }
}

function mapSupportError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "UNAUTHORIZED") {
    return new SuporteTicketUseCaseError("Sessao invalida.", 401);
  }

  if (message === "NOT_FOUND") {
    return new SuporteTicketUseCaseError("Ticket nao encontrado.", 404);
  }

  if (message === "INVALID_PAYLOAD") {
    return new SuporteTicketUseCaseError(fallback, 400);
  }

  if (message === "INVALID_ATTACHMENT") {
    return new SuporteTicketUseCaseError(
      "Envie imagem JPG, PNG, WEBP ou PDF com ate 10 MB.",
      400
    );
  }

  return new SuporteTicketUseCaseError(message || fallback, 500);
}

export async function listarPainelTicketsUseCase(params: {
  service: SuporteTicketService;
}) {
  try {
    const context = await params.service.getPainelContext();
    const data = await params.service.listarTickets(context.idSalao);

    return {
      status: 200,
      body: {
        ok: true,
        ...data,
      },
    };
  } catch (error) {
    throw mapSupportError(error, "Erro ao listar tickets.");
  }
}

export async function criarPainelTicketUseCase(params: {
  body: unknown;
  service: SuporteTicketService;
}) {
  try {
    const context = await params.service.getPainelContext();
    const input = createTicketSchema.parse(params.body);
    const ticket = await params.service.criarTicket({
      context,
      assunto: input.assunto,
      categoria: input.categoria || null,
      prioridade: input.prioridade || null,
      mensagem: input.mensagem,
      contexto: input.contexto,
    });

    return {
      status: 200,
      body: {
        ok: true,
        ticket,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SuporteTicketUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapSupportError(error, "Erro ao abrir ticket.");
  }
}

export async function obterPainelTicketDetalheUseCase(params: {
  idTicket: string;
  service: SuporteTicketService;
}) {
  try {
    const context = await params.service.getPainelContext();
    const detail = await params.service.obterDetalhe({
      idSalao: context.idSalao,
      idTicket: params.idTicket,
    });

    return {
      status: 200,
      body: {
        ok: true,
        detail,
      },
    };
  } catch (error) {
    throw mapSupportError(error, "Erro ao carregar ticket.");
  }
}

export async function responderPainelTicketUseCase(params: {
  idTicket: string;
  body: unknown;
  service: SuporteTicketService;
}) {
  try {
    const context = await params.service.getPainelContext();
    const input = replyTicketSchema.parse(params.body);
    const result = await params.service.responderTicket({
      context,
      idTicket: params.idTicket,
      mensagem: input.mensagem,
    });

    return {
      status: 200,
      body: {
        ok: true,
        result,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SuporteTicketUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapSupportError(error, "Erro ao responder ticket.");
  }
}

export async function anexarPainelTicketUseCase(params: {
  idTicket: string;
  body: unknown;
  service: SuporteTicketService;
}) {
  try {
    const context = await params.service.getPainelContext();
    const input = attachmentTicketSchema.parse(params.body);
    const result = await params.service.anexarTicket({
      context,
      idTicket: params.idTicket,
      bytes: input.bytes,
      contentType: input.contentType,
      fileName: input.fileName,
      mensagem: input.mensagem || null,
    });

    return {
      status: 200,
      body: {
        ok: true,
        result,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SuporteTicketUseCaseError(
        error.issues[0]?.message || "Arquivo invalido.",
        400
      );
    }

    throw mapSupportError(error, "Erro ao enviar anexo.");
  }
}

export async function atualizarPainelTicketStatusUseCase(params: {
  idTicket: string;
  body: unknown;
  service: SuporteTicketService;
}) {
  try {
    const context = await params.service.getPainelContext();
    const input = statusTicketSchema.parse(params.body);
    const result = await params.service.atualizarStatus({
      context,
      idTicket: params.idTicket,
      status: input.status,
      motivo: input.motivo || null,
    });

    return {
      status: 200,
      body: {
        ok: true,
        result,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SuporteTicketUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapSupportError(error, "Erro ao atualizar ticket.");
  }
}
