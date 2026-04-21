import { z } from "zod";
import {
  AuthzError,
  EstoqueComandaServiceError,
  type EstoqueComandaService,
} from "@/services/estoqueComandaService";

const bodySchema = z.object({
  idSalao: z.string().uuid("Salao e comanda sao obrigatorios."),
  idComanda: z.string().uuid("Salao e comanda sao obrigatorios."),
});

export class EstoqueComandaUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "EstoqueComandaUseCaseError";
  }
}

export async function processarEstoqueComandaUseCase(params: {
  body: unknown;
  service: EstoqueComandaService;
}) {
  let idSalao = "";
  let idComanda = "";

  try {
    const input = bodySchema.parse(params.body);
    idSalao = input.idSalao;
    idComanda = input.idComanda;

    const auth = await params.service.validarAcesso(idSalao);
    const comanda = await params.service.validarComanda({ idSalao, idComanda });

    if (String(comanda.status || "").toLowerCase() !== "fechada") {
      throw new EstoqueComandaUseCaseError(
        "A comanda precisa estar fechada para baixar estoque.",
        409
      );
    }

    const result = await params.service.processarComanda({
      idSalao,
      idComanda,
      idUsuario: auth.usuario.id,
    });

    await params.service.registrarLogProcessamento({
      idSalao,
      idUsuario: auth.usuario.id,
      idComanda,
      result,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    if (idSalao && idComanda) {
      await params.service.reportarFalhaProcessamento({
        idSalao,
        idComanda,
        error,
      });
    }

    if (error instanceof EstoqueComandaUseCaseError) {
      throw error;
    }

    if (error instanceof AuthzError) {
      throw new EstoqueComandaUseCaseError(error.message, error.status);
    }

    if (error instanceof EstoqueComandaServiceError) {
      throw new EstoqueComandaUseCaseError(error.message, error.status);
    }

    if (error instanceof z.ZodError) {
      throw new EstoqueComandaUseCaseError(
        error.issues[0]?.message || "Salao e comanda sao obrigatorios.",
        400
      );
    }

    throw new EstoqueComandaUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao processar o estoque da comanda.",
      500
    );
  }
}

export async function reverterEstoqueComandaUseCase(params: {
  body: unknown;
  service: EstoqueComandaService;
}) {
  let idSalao = "";
  let idComanda = "";

  try {
    const input = bodySchema.parse(params.body);
    idSalao = input.idSalao;
    idComanda = input.idComanda;

    const auth = await params.service.validarAcesso(idSalao);
    await params.service.validarComanda({ idSalao, idComanda });

    const result = await params.service.reverterComanda({
      idSalao,
      idComanda,
      idUsuario: auth.usuario.id,
    });

    await params.service.registrarLogReversao({
      idSalao,
      idUsuario: auth.usuario.id,
      idComanda,
      result,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    if (idSalao && idComanda) {
      await params.service.reportarFalhaReversao({
        idSalao,
        idComanda,
        error,
      });
    }

    if (error instanceof EstoqueComandaUseCaseError) {
      throw error;
    }

    if (error instanceof AuthzError) {
      throw new EstoqueComandaUseCaseError(error.message, error.status);
    }

    if (error instanceof EstoqueComandaServiceError) {
      throw new EstoqueComandaUseCaseError(error.message, error.status);
    }

    if (error instanceof z.ZodError) {
      throw new EstoqueComandaUseCaseError(
        error.issues[0]?.message || "Salao e comanda sao obrigatorios.",
        400
      );
    }

    throw new EstoqueComandaUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao reverter o estoque da comanda.",
      500
    );
  }
}
