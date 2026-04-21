import { z } from "zod";
import type { EstoqueService } from "@/services/estoqueService";
import type { AcaoEstoque, EstoqueProcessarBody } from "@/types/estoque";

const ACOES_ESTOQUE = ["movimentacao_manual"] as const satisfies readonly AcaoEstoque[];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function resolveEstoqueHttpStatus(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : undefined));

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().finite().optional());

const estoqueMovimentacaoSchema = z
  .object({
    idProduto: nullableString,
    tipo: nullableString,
    origem: nullableString,
    quantidade: optionalNumber,
    valorUnitario: optionalNumber,
    observacoes: nullableString,
  })
  .partial();

const processarEstoqueBodySchema = z
  .object({
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    acao: z.enum(ACOES_ESTOQUE),
    movimentacao: estoqueMovimentacaoSchema.nullish(),
  })
  .superRefine((body, ctx) => {
    if (body.acao !== "movimentacao_manual") return;

    if (!body.movimentacao?.idProduto) {
      ctx.addIssue({
        code: "custom",
        message: "Produto obrigatorio para movimentacao manual.",
        path: ["movimentacao", "idProduto"],
      });
    }

    if (!body.movimentacao?.tipo) {
      ctx.addIssue({
        code: "custom",
        message: "Tipo obrigatorio para movimentacao manual.",
        path: ["movimentacao", "tipo"],
      });
    }
  });

export class ProcessarEstoqueUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarEstoqueUseCaseError";
  }
}

export type ProcessarEstoqueInput = EstoqueProcessarBody & {
  idSalao: string;
  acao: AcaoEstoque;
  movimentacao: {
    idProduto: string | null;
    tipo: string | null;
    origem: string | null;
    quantidade: number;
    valorUnitario: number;
    observacoes: string | null;
  };
};

export type ProcessarEstoqueUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseProcessarEstoqueInput(body: unknown): ProcessarEstoqueInput {
  const parsed = processarEstoqueBodySchema.parse(body);

  return {
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    acao: parsed.acao,
    movimentacao: {
      idProduto: sanitizeUuid(parsed.movimentacao?.idProduto),
      tipo: sanitizeText(parsed.movimentacao?.tipo),
      origem: sanitizeText(parsed.movimentacao?.origem),
      quantidade: sanitizeMoney(parsed.movimentacao?.quantidade),
      valorUnitario: sanitizeMoney(parsed.movimentacao?.valorUnitario),
      observacoes: sanitizeText(parsed.movimentacao?.observacoes),
    },
  };
}

export async function processarEstoqueUseCase(params: {
  input: ProcessarEstoqueInput;
  actorUserId: string;
  service: EstoqueService;
}): Promise<ProcessarEstoqueUseCaseResult> {
  const { input, actorUserId, service } = params;

  try {
    const data = await service.registrarMovimentacaoManual({
      idSalao: input.idSalao,
      idProduto: input.movimentacao.idProduto,
      idUsuario: actorUserId,
      tipo: input.movimentacao.tipo,
      origem: input.movimentacao.origem,
      quantidade: input.movimentacao.quantidade,
      valorUnitario: input.movimentacao.valorUnitario,
      observacoes: input.movimentacao.observacoes,
    });

    await service.registrarLog({
      gravidade: "info",
      idSalao: input.idSalao,
      idUsuario: actorUserId,
      mensagem: "Movimentacao manual de estoque registrada.",
      detalhes: {
        acao: input.acao,
        id_produto: input.movimentacao.idProduto,
        tipo: input.movimentacao.tipo,
        origem: input.movimentacao.origem,
        quantidade: input.movimentacao.quantidade,
        estoque_atual: data.estoqueAtual,
        id_movimentacao: data.idMovimentacao,
      },
    });

    return {
      status: 200,
      body: {
        ok: true,
        idMovimentacao: data.idMovimentacao,
        estoqueAtual: data.estoqueAtual,
      },
    };
  } catch (error) {
    throw new ProcessarEstoqueUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao processar estoque.",
      resolveEstoqueHttpStatus(error)
    );
  }
}
