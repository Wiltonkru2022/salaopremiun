import { z } from "zod";
import { assertCanCreateWithinLimit, PlanAccessError } from "@/lib/plans/access";
import type {
  AcaoProfissional,
  ProfissionalProcessarPayload,
  ProfissionalServicoPayload,
} from "@/types/profissional";
import type { ProfissionalService } from "@/services/profissionalService";

const ACOES_PROFISSIONAL = [
  "criar",
  "atualizar",
  "atualizar_foto",
  "alterar_status",
  "excluir",
] as const satisfies readonly AcaoProfissional[];

const PROFISSIONAL_FIELDS = [
  "nome",
  "nome_social",
  "categoria",
  "cargo",
  "cpf",
  "rg",
  "data_nascimento",
  "telefone",
  "whatsapp",
  "email",
  "endereco",
  "numero",
  "bairro",
  "cidade",
  "estado",
  "cep",
  "especialidades",
  "data_admissao",
  "bio",
  "tipo_profissional",
  "tipo_vinculo",
  "comissao_produto_percentual",
  "pix_tipo",
  "pix_chave",
  "nivel_acesso",
  "status",
  "ativo",
  "dias_trabalho",
  "pausas",
  "foto_url",
] as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function getString(value: unknown) {
  return String(value || "").trim();
}

function resolveProfissionalHttpStatus(error: unknown) {
  if (error instanceof ProcessarProfissionalUseCaseError) {
    return error.status;
  }

  if (error instanceof PlanAccessError) {
    return error.status;
  }

  const candidate = error as { code?: string } | null;
  if (candidate?.code === "P0001") return 400;
  if (candidate?.code === "23503" || candidate?.code === "23514") return 409;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!message) return 500;
  if (message.includes("nao encontrado")) return 404;
  if (
    message.includes("informe ") ||
    message.includes("obrigatorio") ||
    message.includes("nao pertence") ||
    message.includes("inative o cadastro") ||
    message.includes("remova os vinculos")
  ) {
    return 400;
  }

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

const profissionalSchema = z.record(z.string(), z.unknown()).nullish();

const servicoSchema = z
  .object({
    id_servico: nullableString,
    duracao_minutos: optionalNumber,
    ativo: z.boolean().nullable().optional(),
  })
  .partial();

const processarProfissionalBodySchema = z
  .object({
    acao: z.enum(ACOES_PROFISSIONAL),
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    idProfissional: nullableString,
    profissional: profissionalSchema,
    servicos: z.array(servicoSchema).nullish(),
    assistentes: z.array(z.string()).nullish(),
    foto_url: nullableString,
  })
  .superRefine((body, ctx) => {
    if (
      ["atualizar", "atualizar_foto", "alterar_status", "excluir"].includes(
        body.acao
      ) &&
      !body.idProfissional
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Profissional obrigatorio para esta acao.",
        path: ["idProfissional"],
      });
    }

    if (
      ["criar", "atualizar", "alterar_status"].includes(body.acao) &&
      !body.profissional
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Payload do profissional obrigatorio para esta acao.",
        path: ["profissional"],
      });
    }

    if (body.acao === "atualizar_foto" && !body.foto_url) {
      ctx.addIssue({
        code: "custom",
        message: "Foto obrigatoria para esta acao.",
        path: ["foto_url"],
      });
    }
  });

export class ProcessarProfissionalUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarProfissionalUseCaseError";
  }
}

export type ProcessarProfissionalInput = {
  acao: AcaoProfissional;
  idSalao: string;
  idProfissional?: string;
  profissional?: ProfissionalProcessarPayload | null;
  servicos: ProfissionalServicoPayload[];
  assistentes: string[];
  fotoUrl?: string;
};

export type ProcessarProfissionalUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

function sanitizeProfissionalPayload(
  idSalao: string,
  raw: Record<string, unknown> | undefined
) {
  const input = raw || {};
  const payload: Record<string, unknown> = {
    id_salao: idSalao,
  };

  PROFISSIONAL_FIELDS.forEach((field) => {
    if (field in input) {
      payload[field] = input[field];
    }
  });

  const nome = getString(payload.nome);
  const tipoProfissional =
    getString(payload.tipo_profissional) === "assistente"
      ? "assistente"
      : "profissional";
  const ativo = Boolean(payload.ativo);

  payload.nome = nome;
  payload.tipo_profissional = tipoProfissional;
  payload.nivel_acesso =
    tipoProfissional === "assistente"
      ? "sem_acesso"
      : getString(payload.nivel_acesso) || "proprio";
  payload.status = ativo ? "ativo" : "inativo";
  payload.ativo = ativo;
  payload.comissao_produto_percentual = Number(
    payload.comissao_produto_percentual || 0
  );

  if (!Array.isArray(payload.especialidades)) {
    payload.especialidades = [];
  }

  if (!Array.isArray(payload.dias_trabalho)) {
    payload.dias_trabalho = [];
  }

  if (!Array.isArray(payload.pausas)) {
    payload.pausas = [];
  }

  return {
    payload,
    nome,
    tipoProfissional,
    ativo,
  };
}

function normalizeServicos(input: ProfissionalServicoPayload[] | undefined) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      id_servico: getString(item.id_servico),
      duracao_minutos: Number(item.duracao_minutos || 0),
      ativo: item.ativo ?? true,
    }))
    .filter((item) => item.id_servico);
}

function normalizeIds(input: string[] | undefined) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.map((item) => getString(item)).filter(Boolean)));
}

async function assertProfissionalPodeSerExcluido(params: {
  service: ProfissionalService;
  idSalao: string;
  idProfissional: string;
}) {
  const counts = await params.service.contarDependenciasExclusao({
    idSalao: params.idSalao,
    idProfissional: params.idProfissional,
  });

  if (counts.agendamentosCount > 0) {
    throw new Error(
      "Este profissional ja participou da agenda do salao. Inative o cadastro em vez de excluir."
    );
  }

  if (counts.comandaItensCount > 0) {
    throw new Error(
      "Este profissional ja participou de comandas. Inative o cadastro em vez de excluir."
    );
  }

  if (counts.comissoesCount > 0) {
    throw new Error(
      "Este profissional ja possui lancamentos de comissao. Inative o cadastro em vez de excluir."
    );
  }

  if (counts.valesCount > 0) {
    throw new Error(
      "Este profissional ja possui historico financeiro no caixa. Inative o cadastro em vez de excluir."
    );
  }
}

export function parseProcessarProfissionalInput(
  body: unknown
): ProcessarProfissionalInput {
  const parsed = processarProfissionalBodySchema.parse(body);

  return {
    acao: parsed.acao,
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    idProfissional: sanitizeUuid(parsed.idProfissional) || undefined,
    profissional: (parsed.profissional || null) as ProfissionalProcessarPayload | null,
    servicos: (parsed.servicos || []) as ProfissionalServicoPayload[],
    assistentes: parsed.assistentes || [],
    fotoUrl: getString(parsed.foto_url) || undefined,
  };
}

export async function processarProfissionalUseCase(params: {
  input: ProcessarProfissionalInput;
  service: ProfissionalService;
}): Promise<ProcessarProfissionalUseCaseResult> {
  const { input, service } = params;

  try {
    if (input.acao === "atualizar_foto") {
      if (!input.idProfissional || !input.fotoUrl) {
        throw new Error("Profissional e foto sao obrigatorios.");
      }

      const data = await service.atualizarFoto({
        idSalao: input.idSalao,
        idProfissional: input.idProfissional,
        fotoUrl: input.fotoUrl,
      });

      return {
        status: 200,
        body: {
          ok: true,
          idProfissional: data.idProfissional,
        },
      };
    }

    if (input.acao === "alterar_status") {
      if (!input.idProfissional) {
        throw new Error("Profissional nao informado.");
      }

      const data = await service.alterarStatus({
        idSalao: input.idSalao,
        idProfissional: input.idProfissional,
        ativo: Boolean(input.profissional?.ativo),
      });

      return {
        status: 200,
        body: {
          ok: true,
          idProfissional: data.idProfissional,
          ativo: data.ativo,
          status: data.status,
        },
      };
    }

    if (input.acao === "excluir") {
      if (!input.idProfissional) {
        throw new Error("Profissional nao informado.");
      }

      await assertProfissionalPodeSerExcluido({
        service,
        idSalao: input.idSalao,
        idProfissional: input.idProfissional,
      });

      const data = await service.excluir({
        idSalao: input.idSalao,
        idProfissional: input.idProfissional,
      });

      return {
        status: 200,
        body: {
          ok: true,
          idProfissional: data.idProfissional,
        },
      };
    }

    const { payload, nome, tipoProfissional, ativo } = sanitizeProfissionalPayload(
      input.idSalao,
      (input.profissional || undefined) as Record<string, unknown> | undefined
    );

    const servicos =
      tipoProfissional === "assistente" ? [] : normalizeServicos(input.servicos);
    const assistentes =
      tipoProfissional === "assistente" ? [] : normalizeIds(input.assistentes);

    if (!nome) {
      throw new Error("Informe o nome do profissional.");
    }

    await service.validarServicosDoSalao({
      idSalao: input.idSalao,
      idsServicos: Array.from(new Set(servicos.map((item) => item.id_servico))),
    });

    await service.validarAssistentesDoSalao({
      idSalao: input.idSalao,
      assistentes,
    });

    let idFinal = input.idProfissional || "";

    if (input.acao === "criar") {
      if (ativo) {
        await assertCanCreateWithinLimit(input.idSalao, "profissionais");
      }

      idFinal = await service.criar(payload);
    } else {
      if (!input.idProfissional) {
        throw new Error("Profissional nao informado.");
      }

      const existente = await service.buscarExistente({
        idSalao: input.idSalao,
        idProfissional: input.idProfissional,
      });

      if (!existente?.id) {
        throw new Error("Profissional nao encontrado.");
      }

      if (ativo && existente.ativo !== true) {
        await assertCanCreateWithinLimit(input.idSalao, "profissionais");
      }

      idFinal = await service.atualizar({
        idSalao: input.idSalao,
        idProfissional: input.idProfissional,
        payload,
      });
    }

    if (!idFinal) {
      throw new Error("Nao foi possivel obter o ID do profissional.");
    }

    await service.sincronizarVinculos({
      idSalao: input.idSalao,
      idProfissional: idFinal,
      tipoProfissional,
      servicos,
      assistentes,
    });

    return {
      status: 200,
      body: {
        ok: true,
        idProfissional: idFinal,
      },
    };
  } catch (error) {
    if (error instanceof PlanAccessError) {
      throw error;
    }

    throw new ProcessarProfissionalUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao processar profissional.",
      resolveProfissionalHttpStatus(error)
    );
  }
}
