import { z } from "zod";
import type {
  AcaoServico,
  ComboServicoItemState,
  ConsumoPayload,
  ServicoProcessarPayload,
  VinculoPayload,
} from "@/types/servicos";
import type {
  CategoriaServicoResult,
  ServicoService,
} from "@/services/servicoService";
import { assertCanCreateWithinLimit } from "@/lib/plans/access";

const ACOES_SERVICO = ["salvar", "alterar_status", "excluir"] as const satisfies readonly AcaoServico[];
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

function sanitizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
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

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeOptionalMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function sanitizeBaseCalculo(value: unknown, fallback = "bruto") {
  const parsed = String(value || "").trim().toLowerCase();
  return parsed === "liquido" ? "liquido" : fallback;
}

function resolveServicoHttpStatus(error: unknown) {
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

const servicoSchema = z
  .object({
    id: nullableString,
    id_salao: nullableString,
    nome: nullableString,
    id_categoria: nullableString,
    categoria: nullableString,
    descricao: nullableString,
    gatilho_retorno_dias: optionalNumber,
    duracao_minutos: optionalNumber,
    pausa_minutos: optionalNumber,
    recurso_nome: nullableString,
    preco_padrao: optionalNumber,
    preco_variavel: z.boolean().optional(),
    preco_minimo: optionalNumber,
    custo_produto: optionalNumber,
    comissao_percentual_padrao: optionalNumber,
    comissao_assistente_percentual: optionalNumber,
    base_calculo: nullableString,
    desconta_taxa_maquininha: z.boolean().optional(),
    exige_avaliacao: z.boolean().optional(),
    status: nullableString,
    ativo: z.boolean().optional(),
    eh_combo: z.boolean().optional(),
    combo_resumo: nullableString,
  })
  .partial();

const vinculoSchema = z
  .object({
    id_profissional: nullableString,
    ativo: z.boolean().optional(),
    duracao_minutos: optionalNumber,
    preco_personalizado: optionalNumber,
    comissao_percentual: optionalNumber,
    comissao_assistente_percentual: optionalNumber,
    base_calculo: nullableString,
    desconta_taxa_maquininha: z.boolean().nullable().optional(),
  })
  .partial();

const consumoSchema = z
  .object({
    id_produto: nullableString,
    quantidade_consumo: optionalNumber,
    unidade_medida: nullableString,
    custo_estimado: optionalNumber,
    ativo: z.boolean().optional(),
  })
  .partial();

const comboItemSchema = z
  .object({
    id_servico_item: nullableString,
    ordem: optionalNumber,
    preco_base: optionalNumber,
    percentual_rateio: optionalNumber,
  })
  .partial();

const processarServicoBodySchema = z
  .object({
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    acao: z.enum(ACOES_SERVICO),
    servico: servicoSchema.nullish(),
    novaCategoria: nullableString,
    vinculos: z.array(vinculoSchema).nullish(),
    consumos: z.array(consumoSchema).nullish(),
    combo_itens: z.array(comboItemSchema).nullish(),
  })
  .superRefine((body, ctx) => {
    if (body.acao === "salvar" && !body.servico) {
      ctx.addIssue({
        code: "custom",
        message: "Servico obrigatorio para esta acao.",
        path: ["servico"],
      });
    }

    if ((body.acao === "alterar_status" || body.acao === "excluir") && !body.servico?.id) {
      ctx.addIssue({
        code: "custom",
        message: "Servico obrigatorio para esta acao.",
        path: ["servico", "id"],
      });
    }
  });

export class ProcessarServicoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarServicoUseCaseError";
  }
}

export type ProcessarServicoInput = {
  idSalao: string;
  acao: AcaoServico;
  servico?: (Partial<ServicoProcessarPayload> & { id?: string | null }) | null;
  novaCategoria?: string;
  vinculos: VinculoPayload[];
  consumos: ConsumoPayload[];
  combo_itens: ComboServicoItemState[];
};

export type ProcessarServicoUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

function buildServicoPayload(params: {
  idSalao: string;
  servico: Partial<ServicoProcessarPayload>;
  categoria: CategoriaServicoResult | null;
}) {
  const nome = sanitizeText(params.servico.nome);
  if (!nome) {
    throw new Error("Informe o nome do servico.");
  }

  const ativo = sanitizeBoolean(params.servico.ativo, true);

  return {
    id_salao: params.idSalao,
    nome,
    id_categoria: params.categoria?.id || null,
    categoria: params.categoria?.nome || null,
    descricao: sanitizeText(params.servico.descricao),
    gatilho_retorno_dias: sanitizeOptionalNumber(
      params.servico.gatilho_retorno_dias
    ),
    duracao_minutos: sanitizeNumber(params.servico.duracao_minutos),
    pausa_minutos: sanitizeNumber(params.servico.pausa_minutos),
    recurso_nome: sanitizeText(params.servico.recurso_nome),
    preco_padrao: sanitizeMoney(params.servico.preco_padrao),
    preco_variavel: sanitizeBoolean(params.servico.preco_variavel, false),
    preco_minimo: sanitizeOptionalMoney(params.servico.preco_minimo),
    custo_produto: sanitizeMoney(params.servico.custo_produto),
    comissao_percentual_padrao: sanitizeOptionalMoney(
      params.servico.comissao_percentual_padrao
    ),
    comissao_assistente_percentual: sanitizeMoney(
      params.servico.comissao_assistente_percentual
    ),
    base_calculo: sanitizeBaseCalculo(params.servico.base_calculo),
    desconta_taxa_maquininha: sanitizeBoolean(
      params.servico.desconta_taxa_maquininha,
      false
    ),
    exige_avaliacao: sanitizeBoolean(params.servico.exige_avaliacao, false),
    ativo,
    status: ativo ? "ativo" : "inativo",
    eh_combo: sanitizeBoolean(params.servico.eh_combo, false),
    combo_resumo: sanitizeText(params.servico.combo_resumo),
  };
}

async function resolverCategoria(params: {
  service: ServicoService;
  idSalao: string;
  idCategoria: string | null;
  novaCategoria: string | null;
}) {
  const { service, idSalao, idCategoria, novaCategoria } = params;

  if (idCategoria === "__nova__" || novaCategoria) {
    const nomeNovaCategoria = sanitizeText(novaCategoria);
    if (!nomeNovaCategoria) {
      throw new Error("Informe o nome da nova categoria.");
    }

    return service.criarOuObterCategoria({
      idSalao,
      nome: nomeNovaCategoria,
    });
  }

  const categoriaId = sanitizeUuid(idCategoria);
  if (!categoriaId) return null;

  return service.obterCategoria({
    idSalao,
    idCategoria: categoriaId,
  });
}

export function parseProcessarServicoInput(body: unknown): ProcessarServicoInput {
  const parsed = processarServicoBodySchema.parse(body);

  return {
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    acao: parsed.acao,
    servico: parsed.servico || null,
    novaCategoria: sanitizeText(parsed.novaCategoria) || undefined,
    vinculos: (parsed.vinculos || []) as VinculoPayload[],
    consumos: (parsed.consumos || []) as ConsumoPayload[],
    combo_itens: (parsed.combo_itens || []) as ComboServicoItemState[],
  };
}

export async function processarServicoUseCase(params: {
  input: ProcessarServicoInput;
  service: ServicoService;
}): Promise<ProcessarServicoUseCaseResult> {
  const { input, service } = params;

  try {
    if (input.acao === "salvar") {
      if (!input.servico) {
        throw new Error("Servico obrigatorio para esta acao.");
      }

      if (!sanitizeUuid(input.servico.id)) {
        await assertCanCreateWithinLimit(input.idSalao, "servicos");
      }

      if (sanitizeBoolean(input.servico.eh_combo, false) && input.combo_itens.length < 2) {
        throw new Error("Informe pelo menos dois servicos para montar o combo.");
      }

      const categoria = await resolverCategoria({
        service,
        idSalao: input.idSalao,
        idCategoria: String(input.servico.id_categoria || ""),
        novaCategoria: sanitizeText(input.novaCategoria),
      });

      const payload = buildServicoPayload({
        idSalao: input.idSalao,
        servico: input.servico,
        categoria,
      });

      const idServico = await service.salvarCatalogoTransacional({
        idSalao: input.idSalao,
        idServico: sanitizeUuid(input.servico.id),
        servicoPayload: payload,
        vinculos: input.vinculos,
        consumos: input.consumos,
        comboItens: input.combo_itens,
      });

      return {
        status: 200,
        body: {
          ok: true,
          idServico,
          categoria,
        },
      };
    }

    const idServico = sanitizeUuid(input.servico?.id);
    if (!idServico) {
      throw new Error("Servico obrigatorio para esta acao.");
    }

    if (input.acao === "alterar_status") {
      const data = await service.alterarStatus({
        idSalao: input.idSalao,
        idServico,
        ativo: sanitizeBoolean(input.servico?.ativo, true),
      });

      return {
        status: 200,
        body: {
          ok: true,
          idServico: data.idServico,
          ativo: data.ativo,
          status: data.status,
        },
      };
    }

    const data = await service.excluir({
      idSalao: input.idSalao,
      idServico,
    });

    return {
      status: 200,
      body: {
        ok: true,
        idServico: data.idServico,
      },
    };
  } catch (error) {
    throw new ProcessarServicoUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao processar servico.",
      resolveServicoHttpStatus(error)
    );
  }
}
