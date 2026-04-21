import { z } from "zod";
import type { AppProfissionalSuporteService } from "@/services/appProfissionalSuporteService";

const finalizarSuporteSchema = z.object({
  conversaId: z.string().trim().min(1, "Conversa nao informada."),
});

export class FinalizarSuporteIAUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public idSalao?: string
  ) {
    super(message);
    this.name = "FinalizarSuporteIAUseCaseError";
  }
}

export async function finalizarSuporteIAUseCase(params: {
  body: unknown;
  service: AppProfissionalSuporteService;
}) {
  let idSalao = "";

  try {
    const session = await params.service.requireSession();
    idSalao = session.idSalao;
    const input = finalizarSuporteSchema.parse(params.body);

    await params.service.excluirConversa({
      idConversa: input.conversaId,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
    });

    return {
      status: 200,
      idSalao,
      body: {
        ok: true,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new FinalizarSuporteIAUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400,
        idSalao
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      throw new FinalizarSuporteIAUseCaseError(
        "Sessao do profissional nao encontrada.",
        401,
        idSalao
      );
    }

    throw new FinalizarSuporteIAUseCaseError(
      error instanceof Error ? error.message : "Erro ao finalizar chat.",
      500,
      idSalao
    );
  }
}
