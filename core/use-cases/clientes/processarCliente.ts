import { z } from "zod";
import type {
  ClienteAuthPayload,
  ClienteAutorizacoesPayload,
  ClienteFichaPayload,
  ClientePayload,
  ClientePreferenciasPayload,
} from "@/types/clientes";
import {
  normalizarEmailCliente,
  normalizarTelefoneCliente,
} from "@/core/entities/cliente";
import type { ClienteService } from "@/services/clienteService";
import { PlanAccessError } from "@/lib/plans/access";

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

function resolveHttpStatus(error: unknown) {
  if (error instanceof ProcessarClienteUseCaseError) {
    return error.status;
  }

  if (error instanceof PlanAccessError) {
    return error.status;
  }

  const candidate = error as { code?: string } | null;
  if (candidate?.code === "P0001") return 400;
  if (candidate?.code === "23505" || candidate?.code === "23514") return 409;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!message) return 500;
  if (message.includes("nao encontrada") || message.includes("nao encontrado")) {
    return 404;
  }
  if (
    message.includes("obrigatorio") ||
    message.includes("informe ") ||
    message.includes("inative o cadastro") ||
    message.includes("ja existe cliente")
  ) {
    return 400;
  }

  return 500;
}

const clienteSchema = z.record(z.string(), z.unknown()).nullish();

const processarClienteBodySchema = z
  .object({
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    acao: z.enum(["salvar", "alterar_status", "excluir"]),
    cliente: clienteSchema,
    ficha: clienteSchema,
    preferencias: clienteSchema,
    autorizacoes: clienteSchema,
    auth: clienteSchema,
  })
  .superRefine((body, ctx) => {
    if (!body.cliente) {
      ctx.addIssue({
        code: "custom",
        message: "Cliente obrigatorio para esta acao.",
        path: ["cliente"],
      });
      return;
    }

    if ((body.acao === "alterar_status" || body.acao === "excluir") && !body.cliente.id) {
      ctx.addIssue({
        code: "custom",
        message: "Cliente obrigatorio para esta acao.",
        path: ["cliente", "id"],
      });
    }
  });

export class ProcessarClienteUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarClienteUseCaseError";
  }
}

export type ProcessarClienteInput = {
  idSalao: string;
  acao: "salvar" | "alterar_status" | "excluir";
  cliente: ClientePayload | null;
  ficha: ClienteFichaPayload | null;
  preferencias: ClientePreferenciasPayload | null;
  autorizacoes: ClienteAutorizacoesPayload | null;
  auth: ClienteAuthPayload | null;
};

export type ProcessarClienteUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

function buildClientePayload(idSalao: string, cliente: ClientePayload) {
  const nome = sanitizeText(cliente.nome);
  if (!nome) {
    throw new Error("Informe o nome da cliente.");
  }

  const ativo = sanitizeBoolean(cliente.ativo, true);

  return {
    id_salao: idSalao,
    nome,
    nome_social: sanitizeText(cliente.nome_social),
    data_nascimento: sanitizeText(cliente.data_nascimento),
    whatsapp: normalizarTelefoneCliente(cliente.whatsapp),
    telefone: normalizarTelefoneCliente(cliente.telefone),
    email: normalizarEmailCliente(cliente.email),
    cpf: normalizarTelefoneCliente(cliente.cpf),
    endereco: sanitizeText(cliente.endereco),
    numero: sanitizeText(cliente.numero),
    bairro: sanitizeText(cliente.bairro),
    cidade: sanitizeText(cliente.cidade),
    estado: sanitizeText(cliente.estado),
    cep: sanitizeText(cliente.cep),
    profissao: sanitizeText(cliente.profissao),
    observacoes: sanitizeText(cliente.observacoes),
    foto_url: sanitizeText(cliente.foto_url),
    ativo,
    status: ativo ? "ativo" : "inativo",
  };
}

function buildFichaPayload(
  idSalao: string,
  idCliente: string,
  ficha: ClienteFichaPayload | null | undefined
) {
  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    alergias: sanitizeText(ficha?.alergias),
    historico_quimico: sanitizeText(ficha?.historico_quimico),
    condicoes_couro_cabeludo_pele: sanitizeText(
      ficha?.condicoes_couro_cabeludo_pele
    ),
    uso_medicamentos: sanitizeText(ficha?.uso_medicamentos),
    gestante: sanitizeBoolean(ficha?.gestante, false),
    lactante: sanitizeBoolean(ficha?.lactante, false),
    restricoes_quimicas: sanitizeText(ficha?.restricoes_quimicas),
    observacoes_tecnicas: sanitizeText(ficha?.observacoes_tecnicas),
  };
}

function buildPreferenciasPayload(
  idSalao: string,
  idCliente: string,
  preferencias: ClientePreferenciasPayload | null | undefined
) {
  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    bebida_favorita: sanitizeText(preferencias?.bebida_favorita),
    estilo_atendimento: sanitizeText(preferencias?.estilo_atendimento),
    revistas_assuntos_preferidos: sanitizeText(
      preferencias?.revistas_assuntos_preferidos
    ),
    como_conheceu_salao: sanitizeText(preferencias?.como_conheceu_salao),
    profissional_favorito_id: sanitizeUuid(
      preferencias?.profissional_favorito_id
    ),
    frequencia_visitas: sanitizeText(preferencias?.frequencia_visitas),
    preferencias_gerais: sanitizeText(preferencias?.preferencias_gerais),
  };
}

function buildAutorizacoesPayload(
  idSalao: string,
  idCliente: string,
  autorizacoes: ClienteAutorizacoesPayload | null | undefined
) {
  const termoLgpdAceito = sanitizeBoolean(
    autorizacoes?.termo_lgpd_aceito,
    false
  );

  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    autoriza_uso_imagem: sanitizeBoolean(
      autorizacoes?.autoriza_uso_imagem,
      false
    ),
    autoriza_whatsapp_marketing: sanitizeBoolean(
      autorizacoes?.autoriza_whatsapp_marketing,
      false
    ),
    autoriza_email_marketing: sanitizeBoolean(
      autorizacoes?.autoriza_email_marketing,
      false
    ),
    termo_lgpd_aceito: termoLgpdAceito,
    data_aceite_lgpd: termoLgpdAceito
      ? sanitizeText(autorizacoes?.data_aceite_lgpd) || new Date().toISOString()
      : null,
    observacoes_autorizacao: sanitizeText(
      autorizacoes?.observacoes_autorizacao
    ),
  };
}

function buildAuthPayload(
  idSalao: string,
  idCliente: string,
  auth: ClienteAuthPayload | null | undefined,
  fallbackEmail: string | null
) {
  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    email: sanitizeText(auth?.email) || fallbackEmail,
    senha_hash: sanitizeText(auth?.senha_hash),
    app_ativo: sanitizeBoolean(auth?.app_ativo, false),
  };
}

async function assertClientePodeSerExcluido(params: {
  service: ClienteService;
  idSalao: string;
  idCliente: string;
}) {
  const counts = await params.service.contarDependenciasExclusao({
    idSalao: params.idSalao,
    idCliente: params.idCliente,
  });

  if (counts.agendamentosCount > 0) {
    throw new Error(
      "Esta cliente ja possui historico de agenda. Inative o cadastro em vez de excluir."
    );
  }

  if (counts.comandasCount > 0) {
    throw new Error(
      "Esta cliente ja possui historico de comanda. Inative o cadastro em vez de excluir."
    );
  }
}

export function parseProcessarClienteInput(body: unknown): ProcessarClienteInput {
  const parsed = processarClienteBodySchema.parse(body);

  return {
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    acao: parsed.acao,
    cliente: (parsed.cliente || null) as ClientePayload | null,
    ficha: (parsed.ficha || null) as ClienteFichaPayload | null,
    preferencias: (parsed.preferencias || null) as ClientePreferenciasPayload | null,
    autorizacoes: (parsed.autorizacoes || null) as ClienteAutorizacoesPayload | null,
    auth: (parsed.auth || null) as ClienteAuthPayload | null,
  };
}

export async function processarClienteUseCase(params: {
  input: ProcessarClienteInput;
  service: ClienteService;
}): Promise<ProcessarClienteUseCaseResult> {
  const { input, service } = params;

  try {
    if (!input.cliente) {
      throw new Error("Cliente obrigatorio para esta acao.");
    }

    if (input.acao === "salvar") {
      const payloadCliente = buildClientePayload(input.idSalao, input.cliente);
      const idClienteAtual = sanitizeUuid(input.cliente.id);

      await service.verificarDuplicidade({
        idSalao: input.idSalao,
        idClienteAtual,
        email: payloadCliente.email as string | null | undefined,
        whatsapp: payloadCliente.whatsapp as string | null | undefined,
        telefone: payloadCliente.telefone as string | null | undefined,
        cpf: payloadCliente.cpf as string | null | undefined,
      });

      const data = await service.salvar({
        idSalao: input.idSalao,
        idCliente: idClienteAtual,
        payload: payloadCliente,
      });

      const idCliente = data.idCliente;

      await service.upsertByCliente({
        table: "clientes_ficha_tecnica",
        payload: buildFichaPayload(input.idSalao, idCliente, input.ficha),
        idSalao: input.idSalao,
        idCliente,
      });

      await service.upsertByCliente({
        table: "clientes_preferencias",
        payload: buildPreferenciasPayload(
          input.idSalao,
          idCliente,
          input.preferencias
        ),
        idSalao: input.idSalao,
        idCliente,
      });

      await service.upsertByCliente({
        table: "clientes_autorizacoes",
        payload: buildAutorizacoesPayload(
          input.idSalao,
          idCliente,
          input.autorizacoes
        ),
        idSalao: input.idSalao,
        idCliente,
      });

      await service.upsertByCliente({
        table: "clientes_auth",
        payload: buildAuthPayload(
          input.idSalao,
          idCliente,
          input.auth,
          sanitizeText(payloadCliente.email)
        ),
        idSalao: input.idSalao,
        idCliente,
      });

      return {
        status: 200,
        body: {
          ok: true,
          idCliente,
        },
      };
    }

    const idCliente = sanitizeUuid(input.cliente.id);
    if (!idCliente) {
      throw new Error("Cliente obrigatorio para esta acao.");
    }

    if (input.acao === "alterar_status") {
      const data = await service.alterarStatus({
        idSalao: input.idSalao,
        idCliente,
        ativo: sanitizeBoolean(input.cliente.ativo, true),
      });

      return {
        status: 200,
        body: {
          ok: true,
          idCliente: data.idCliente,
          ativo: data.ativo,
          status: data.status,
        },
      };
    }

    await assertClientePodeSerExcluido({
      service,
      idSalao: input.idSalao,
      idCliente,
    });

    const data = await service.excluir({
      idSalao: input.idSalao,
      idCliente,
    });

    return {
      status: 200,
      body: {
        ok: true,
        idCliente: data.idCliente,
      },
    };
  } catch (error) {
    if (error instanceof PlanAccessError) {
      throw error;
    }

    throw new ProcessarClienteUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao processar cliente.",
      resolveHttpStatus(error)
    );
  }
}
