import { z } from "zod";
import type { SuporteTicketService } from "@/services/suporteTicketService";

const createProfissionalTicketSchema = z.object({
  assunto: z.string().trim().min(1, "Preencha assunto e mensagem para abrir o ticket."),
  categoria: z.string().nullable().optional(),
  prioridade: z.string().nullable().optional(),
  mensagem: z.string().trim().min(1, "Preencha assunto e mensagem para abrir o ticket."),
  contexto: z.record(z.string(), z.unknown()).optional().default({}),
});

export class ProfissionalTicketUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public idSalao?: string
  ) {
    super(message);
    this.name = "ProfissionalTicketUseCaseError";
  }
}

function mapSupportError(error: unknown, fallback: string, idSalao?: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "UNAUTHORIZED") {
    return new ProfissionalTicketUseCaseError(
      "Sessao do profissional invalida.",
      401,
      idSalao
    );
  }

  if (message === "INVALID_PAYLOAD") {
    return new ProfissionalTicketUseCaseError(
      "Preencha assunto e mensagem para abrir o ticket.",
      400,
      idSalao
    );
  }

  return new ProfissionalTicketUseCaseError(message || fallback, 500, idSalao);
}

export async function criarProfissionalTicketUseCase(params: {
  body: unknown;
  service: SuporteTicketService;
}) {
  let idSalao = "";

  try {
    const context = await params.service.getProfissionalContext();
    idSalao = context.idSalao;
    const input = createProfissionalTicketSchema.parse(params.body);

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
      idSalao,
      body: {
        ok: true,
        ticket,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ProfissionalTicketUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400,
        idSalao
      );
    }

    throw mapSupportError(error, "Erro ao abrir ticket pelo app profissional.", idSalao);
  }
}
