import { z } from "zod";
import { assertCanMutatePlanFeature } from "@/lib/plans/access";
import type { CaixaService } from "@/services/caixaService";
import type { ProcessarCaixaAcao } from "@/types/caixa";
import type { CaixaProcessarBody } from "@/lib/caixa/processar/types";
import {
  ACOES_CAIXA,
  isAcaoCaixa,
} from "@/lib/caixa/processar/dispatcher";
import {
  CaixaInputError,
  resolveHttpStatus,
  sanitizeIdempotencyKey,
  sanitizeMoney,
  sanitizeInteger,
  sanitizeText,
  sanitizeUuid,
} from "@/lib/caixa/processar/utils";

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : undefined));

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().finite().optional());

const comandaSchema = z
  .object({
    idComanda: nullableString,
  })
  .partial();

const sessaoSchema = z
  .object({
    idSessao: nullableString,
    valorAbertura: optionalNumber,
    valorFechamento: optionalNumber,
    observacoes: nullableString,
  })
  .partial();

const movimentoSchema = z
  .object({
    tipo: nullableString,
    valor: optionalNumber,
    descricao: nullableString,
    idProfissional: nullableString,
    idComanda: nullableString,
    formaPagamento: nullableString,
  })
  .partial();

const pagamentoSchema = z
  .object({
    idPagamento: nullableString,
    formaPagamento: nullableString,
    valorBase: optionalNumber,
    parcelas: optionalNumber,
    destinoExcedente: nullableString,
    observacoes: nullableString,
  })
  .partial();

const processarCaixaBodySchema = z
  .object({
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    acao: z.enum(ACOES_CAIXA),
    idempotencyKey: nullableString,
    comanda: comandaSchema.nullish(),
    sessao: sessaoSchema.nullish(),
    movimento: movimentoSchema.nullish(),
    pagamento: pagamentoSchema.nullish(),
    motivo: nullableString,
  })
  .superRefine((body, ctx) => {
    if (
      ["adicionar_pagamento", "remover_pagamento", "finalizar_comanda", "cancelar_comanda"].includes(
        body.acao
      ) &&
      !body.comanda?.idComanda
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Comanda obrigatoria para esta acao.",
        path: ["comanda", "idComanda"],
      });
    }
  });

export class ProcessarCaixaUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarCaixaUseCaseError";
  }
}

export type ProcessarCaixaInput = CaixaProcessarBody & {
  idSalao: string;
  acao: ProcessarCaixaAcao;
  idempotencyKey?: string;
  comanda?: {
    idComanda?: string;
  };
  sessao?: {
    idSessao?: string;
    valorAbertura?: number;
    valorFechamento?: number;
    observacoes?: string;
  };
  movimento?: {
    tipo?: string;
    valor?: number;
    descricao?: string;
    idProfissional?: string;
    idComanda?: string;
    formaPagamento?: string;
  };
  pagamento?: {
    idPagamento?: string;
    formaPagamento?: string;
    valorBase?: number;
    parcelas?: number;
    destinoExcedente?: string;
    observacoes?: string;
  };
  motivo?: string;
};

export type ProcessarCaixaUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseProcessarCaixaInput(body: unknown): ProcessarCaixaInput {
  const parsed = processarCaixaBodySchema.parse(body);

  return {
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    acao: parsed.acao,
    idempotencyKey: sanitizeIdempotencyKey(parsed.idempotencyKey) || undefined,
    motivo: sanitizeText(parsed.motivo) || undefined,
    comanda: parsed.comanda
      ? {
          idComanda: sanitizeUuid(parsed.comanda.idComanda) || undefined,
        }
      : undefined,
    sessao: parsed.sessao
      ? {
          idSessao: sanitizeUuid(parsed.sessao.idSessao) || undefined,
          valorAbertura:
            parsed.sessao.valorAbertura !== undefined
              ? sanitizeMoney(parsed.sessao.valorAbertura)
              : undefined,
          valorFechamento:
            parsed.sessao.valorFechamento !== undefined
              ? sanitizeMoney(parsed.sessao.valorFechamento)
              : undefined,
          observacoes: sanitizeText(parsed.sessao.observacoes) || undefined,
        }
      : undefined,
    movimento: parsed.movimento
      ? {
          tipo: sanitizeText(parsed.movimento.tipo) || undefined,
          valor:
            parsed.movimento.valor !== undefined
              ? sanitizeMoney(parsed.movimento.valor)
              : undefined,
          descricao: sanitizeText(parsed.movimento.descricao) || undefined,
          idProfissional:
            sanitizeUuid(parsed.movimento.idProfissional) || undefined,
          idComanda: sanitizeUuid(parsed.movimento.idComanda) || undefined,
          formaPagamento:
            sanitizeText(parsed.movimento.formaPagamento) || undefined,
        }
      : undefined,
    pagamento: parsed.pagamento
      ? {
          idPagamento: sanitizeUuid(parsed.pagamento.idPagamento) || undefined,
          formaPagamento:
            sanitizeText(parsed.pagamento.formaPagamento) || undefined,
          valorBase:
            parsed.pagamento.valorBase !== undefined
              ? sanitizeMoney(parsed.pagamento.valorBase)
              : undefined,
          parcelas:
            parsed.pagamento.parcelas !== undefined
              ? sanitizeInteger(parsed.pagamento.parcelas)
              : undefined,
          destinoExcedente:
            sanitizeText(parsed.pagamento.destinoExcedente) || undefined,
          observacoes:
            sanitizeText(parsed.pagamento.observacoes) || undefined,
        }
      : undefined,
  };
}

export async function processarCaixaUseCase(params: {
  input: ProcessarCaixaInput;
  service: CaixaService;
}): Promise<ProcessarCaixaUseCaseResult> {
  const { input, service } = params;

  try {
    if (!isAcaoCaixa(input.acao)) {
      throw new CaixaInputError("Acao invalida.");
    }

    const { ctx } = await service.criarContexto({
      idSalao: input.idSalao,
      acao: input.acao,
    });

    await assertCanMutatePlanFeature(input.idSalao, "caixa");

    const result = await service.processarAcao({
      ctx,
      body: input,
      acao: input.acao,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    if (error instanceof CaixaInputError) {
      throw error;
    }

    throw new ProcessarCaixaUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao processar acao do caixa.",
      resolveHttpStatus(error)
    );
  }
}
