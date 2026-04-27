import { z } from "zod";
import { PlanAccessError, assertCanMutatePlanFeature } from "@/lib/plans/access";
import { hashPassword } from "@/lib/profissional-auth.server";
import type { ProfissionalAcessoService } from "@/services/profissionalAcessoService";

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

const salvarProfissionalAcessoSchema = z.object({
  id_profissional: z.string().trim().min(1, "ID do profissional e obrigatorio."),
  cpf: z.string().trim().min(1, "CPF e obrigatorio."),
  senha: z.string().optional().default(""),
  ativo: z.boolean(),
  ticket_recuperacao_id: z.string().trim().optional(),
});

export class SalvarProfissionalAcessoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SalvarProfissionalAcessoUseCaseError";
  }
}

export type SalvarProfissionalAcessoInput = {
  idProfissional: string;
  cpf: string;
  senha?: string;
  ativo: boolean;
  ticketRecuperacaoId?: string;
};

export type SalvarProfissionalAcessoResult = {
  body: Record<string, unknown>;
  status: number;
  idSalao?: string;
};

function resolveHttpStatus(error: unknown) {
  if (error instanceof SalvarProfissionalAcessoUseCaseError) {
    return error.status;
  }

  if (error instanceof PlanAccessError) {
    return error.status;
  }

  const candidate = error as { code?: string } | null;
  if (candidate?.code === "23505") return 409;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!message) return 500;
  if (message.includes("nao encontrado")) return 404;
  if (message.includes("obrigatorio") || message.includes("informe ")) return 400;
  return 500;
}

export function parseSalvarProfissionalAcessoInput(
  body: unknown
): SalvarProfissionalAcessoInput {
  const parsed = salvarProfissionalAcessoSchema.parse(body);
  return {
    idProfissional: parsed.id_profissional.trim(),
    cpf: onlyDigits(parsed.cpf),
    senha: parsed.senha?.trim() || undefined,
    ativo: parsed.ativo,
    ticketRecuperacaoId: parsed.ticket_recuperacao_id?.trim() || undefined,
  };
}

export async function salvarProfissionalAcessoUseCase(params: {
  input: SalvarProfissionalAcessoInput;
  service: ProfissionalAcessoService;
}): Promise<SalvarProfissionalAcessoResult> {
  const { input, service } = params;

  try {
    if (!input.cpf) {
      throw new Error("CPF e obrigatorio.");
    }

    const profissional = await service.buscarProfissional(input.idProfissional);

    if (!profissional?.id || !profissional.id_salao) {
      throw new Error("Profissional nao encontrado.");
    }

    if (input.ativo) {
      await assertCanMutatePlanFeature(profissional.id_salao, "app_profissional");
    }

    const cpfEmUso = await service.buscarCpfEmUso({
      idSalao: String(profissional.id_salao),
      cpf: input.cpf,
      idProfissional: input.idProfissional,
    });

    if (cpfEmUso?.id) {
      throw new SalvarProfissionalAcessoUseCaseError(
        "Este CPF ja esta vinculado a outro acesso profissional.",
        409
      );
    }

    const acessoExistente = await service.buscarAcessoExistente({
      idSalao: String(profissional.id_salao),
      idProfissional: input.idProfissional,
    });

    let senhaHashFinal = acessoExistente?.senha_hash || null;
    if (input.senha) {
      senhaHashFinal = await hashPassword(input.senha);
    }

    if (input.ativo && !senhaHashFinal) {
      throw new SalvarProfissionalAcessoUseCaseError(
        "Informe uma senha para liberar o primeiro acesso do profissional ao app.",
        400
      );
    }

    await service.salvarAcesso({
      idSalao: String(profissional.id_salao),
      idProfissional: input.idProfissional,
      cpf: input.cpf,
      senhaHash: senhaHashFinal,
      ativo: input.ativo,
      idAcesso: acessoExistente?.id,
    });

    if (input.ticketRecuperacaoId && input.senha) {
      try {
        const salao = await service.buscarSalao(String(profissional.id_salao));
        await service.finalizarTicketRecuperacao({
          idSalao: String(profissional.id_salao),
          idProfissional: input.idProfissional,
          idTicket: input.ticketRecuperacaoId,
          nomeProfissional: String(profissional.nome || "").trim() || "Profissional",
          nomeSalao:
            String(salao?.nome_fantasia || "").trim() ||
            String(salao?.nome || "").trim() ||
            "Salao",
        });
      } catch (ticketError) {
        console.error("[PROFISSIONAL_ACESSO_RECOVERY_TICKET_ERROR]", {
          idProfissional: input.idProfissional,
          idTicket: input.ticketRecuperacaoId,
          error:
            ticketError instanceof Error
              ? ticketError.message
              : "erro_desconhecido",
        });
      }
    }

    return {
      status: 200,
      idSalao: String(profissional.id_salao),
      body: {
        success: true,
      },
    };
  } catch (error) {
    if (
      error instanceof SalvarProfissionalAcessoUseCaseError ||
      error instanceof PlanAccessError
    ) {
      throw error;
    }

    throw new SalvarProfissionalAcessoUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao salvar acesso do profissional.",
      resolveHttpStatus(error)
    );
  }
}
