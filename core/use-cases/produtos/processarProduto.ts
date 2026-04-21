import { z } from "zod";
import type {
  AcaoProduto,
  ProdutoPayload,
} from "@/types/produtos";
import type { ProdutoService } from "@/services/produtoService";

const ACOES_PRODUTO = ["salvar", "alterar_status", "excluir"] as const satisfies readonly AcaoProduto[];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
}

function resolveProdutoHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
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

const produtoSchema = z
  .object({
    id: nullableString,
    id_salao: nullableString,
    nome: nullableString,
    sku: nullableString,
    codigo_barras: nullableString,
    marca: nullableString,
    linha: nullableString,
    unidade_medida: nullableString,
    quantidade_por_embalagem: optionalNumber,
    preco_custo: optionalNumber,
    custos_extras: optionalNumber,
    custo_por_dose: optionalNumber,
    dose_padrao: optionalNumber,
    unidade_dose: nullableString,
    preco_venda: optionalNumber,
    margem_lucro_percentual: optionalNumber,
    estoque_atual: optionalNumber,
    estoque_minimo: optionalNumber,
    estoque_maximo: optionalNumber,
    data_validade: nullableString,
    lote: nullableString,
    destinacao: nullableString,
    categoria: nullableString,
    comissao_revenda_percentual: optionalNumber,
    fornecedor_nome: nullableString,
    fornecedor_contato_nome: nullableString,
    fornecedor_telefone: nullableString,
    fornecedor_whatsapp: nullableString,
    prazo_medio_entrega_dias: optionalNumber,
    observacoes: nullableString,
    foto_url: nullableString,
    ativo: z.boolean().optional(),
    status: nullableString,
  })
  .partial();

const processarProdutoBodySchema = z
  .object({
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    acao: z.enum(ACOES_PRODUTO),
    produto: produtoSchema.nullish(),
  })
  .superRefine((body, ctx) => {
    if (body.acao === "salvar" && !body.produto) {
      ctx.addIssue({
        code: "custom",
        message: "Produto obrigatorio para esta acao.",
        path: ["produto"],
      });
    }

    if ((body.acao === "alterar_status" || body.acao === "excluir") && !body.produto?.id) {
      ctx.addIssue({
        code: "custom",
        message: "Produto obrigatorio para esta acao.",
        path: ["produto", "id"],
      });
    }
  });

export class ProcessarProdutoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarProdutoUseCaseError";
  }
}

export type ProcessarProdutoInput = {
  idSalao: string;
  acao: AcaoProduto;
  produto?: Partial<ProdutoPayload> | null;
};

export type ProcessarProdutoUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

function buildProdutoPayload(idSalao: string, produto: Partial<ProdutoPayload>) {
  const nome = sanitizeText(produto.nome);
  if (!nome) {
    throw new Error("Informe o nome do produto.");
  }

  const ativo = sanitizeBoolean(produto.ativo, true);

  return {
    id_salao: idSalao,
    nome,
    sku: sanitizeText(produto.sku),
    codigo_barras: sanitizeText(produto.codigo_barras),
    marca: sanitizeText(produto.marca),
    linha: sanitizeText(produto.linha),
    unidade_medida: sanitizeText(produto.unidade_medida) || "un",
    quantidade_por_embalagem: sanitizeNumber(produto.quantidade_por_embalagem),
    preco_custo: sanitizeMoney(produto.preco_custo),
    custos_extras: sanitizeMoney(produto.custos_extras),
    custo_por_dose: sanitizeMoney(produto.custo_por_dose),
    dose_padrao: sanitizeNumber(produto.dose_padrao),
    unidade_dose: sanitizeText(produto.unidade_dose),
    preco_venda: sanitizeMoney(produto.preco_venda),
    margem_lucro_percentual: sanitizeMoney(produto.margem_lucro_percentual),
    estoque_atual: sanitizeNumber(produto.estoque_atual),
    estoque_minimo: sanitizeNumber(produto.estoque_minimo),
    estoque_maximo: sanitizeOptionalNumber(produto.estoque_maximo),
    data_validade: sanitizeText(produto.data_validade),
    lote: sanitizeText(produto.lote),
    destinacao: sanitizeText(produto.destinacao) || "uso_interno",
    categoria: sanitizeText(produto.categoria),
    comissao_revenda_percentual: sanitizeMoney(
      produto.comissao_revenda_percentual
    ),
    fornecedor_nome: sanitizeText(produto.fornecedor_nome),
    fornecedor_contato_nome: sanitizeText(produto.fornecedor_contato_nome),
    fornecedor_telefone: sanitizeText(produto.fornecedor_telefone),
    fornecedor_whatsapp: sanitizeText(produto.fornecedor_whatsapp),
    prazo_medio_entrega_dias: sanitizeOptionalNumber(
      produto.prazo_medio_entrega_dias
    ),
    observacoes: sanitizeText(produto.observacoes),
    foto_url: sanitizeText(produto.foto_url),
    ativo,
    status: ativo ? "ativo" : "inativo",
  };
}

async function assertProdutoPodeSerExcluido(params: {
  service: ProdutoService;
  idSalao: string;
  idProduto: string;
}) {
  const counts = await params.service.contarDependenciasExclusao({
    idSalao: params.idSalao,
    idProduto: params.idProduto,
  });

  if (counts.movimentacoesCount > 0) {
    throw new Error(
      "Este produto ja tem historico de estoque. Inative o cadastro em vez de excluir."
    );
  }

  if (counts.comandaItensCount > 0) {
    throw new Error(
      "Este produto ja foi usado em comandas. Inative o cadastro em vez de excluir."
    );
  }

  if (counts.consumoServicoCount > 0) {
    throw new Error(
      "Este produto esta vinculado ao consumo de servicos. Remova os vinculos antes de excluir."
    );
  }
}

export function parseProcessarProdutoInput(body: unknown): ProcessarProdutoInput {
  const parsed = processarProdutoBodySchema.parse(body);

  return {
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    acao: parsed.acao,
    produto: parsed.produto || null,
  };
}

export async function processarProdutoUseCase(params: {
  input: ProcessarProdutoInput;
  service: ProdutoService;
}): Promise<ProcessarProdutoUseCaseResult> {
  const { input, service } = params;

  try {
    if (input.acao === "salvar") {
      if (!input.produto) {
        throw new Error("Produto obrigatorio para esta acao.");
      }

      const payload = buildProdutoPayload(input.idSalao, input.produto);
      const data = await service.salvar({
        idSalao: input.idSalao,
        idProduto: sanitizeUuid(input.produto.id),
        payload,
      });

      return {
        status: 200,
        body: {
          ok: true,
          idProduto: data.idProduto,
        },
      };
    }

    const idProduto = sanitizeUuid(input.produto?.id);
    if (!idProduto) {
      throw new Error("Produto obrigatorio para esta acao.");
    }

    if (input.acao === "alterar_status") {
      const data = await service.alterarStatus({
        idSalao: input.idSalao,
        idProduto,
        ativo: sanitizeBoolean(input.produto?.ativo, true),
      });

      return {
        status: 200,
        body: {
          ok: true,
          idProduto: data.idProduto,
          ativo: data.ativo,
          status: data.status,
        },
      };
    }

    await assertProdutoPodeSerExcluido({
      service,
      idSalao: input.idSalao,
      idProduto,
    });

    const data = await service.excluir({
      idSalao: input.idSalao,
      idProduto,
    });

    return {
      status: 200,
      body: {
        ok: true,
        idProduto: data.idProduto,
      },
    };
  } catch (error) {
    throw new ProcessarProdutoUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao processar produto.",
      resolveProdutoHttpStatus(error)
    );
  }
}
