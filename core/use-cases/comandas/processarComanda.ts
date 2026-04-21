import { z } from "zod";
import {
  COMANDA_ACTIONS,
  resolveComandaHttpStatus,
  sanitizeIdempotencyKey,
  sanitizeUuid,
} from "@/lib/comandas/processar";
import type { ComandaService } from "@/services/comandaService";
import type { AcaoComanda, ProcessarComandaBody } from "@/types/comandas";

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : undefined));

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().finite().optional());

const comandaPayloadSchema = z
  .object({
    idComanda: nullableString,
    numero: optionalNumber,
    idCliente: nullableString,
    status: nullableString,
    observacoes: nullableString,
    desconto: optionalNumber,
    acrescimo: optionalNumber,
  })
  .partial();

const itemPayloadSchema = z
  .object({
    idItem: nullableString,
    tipo_item: nullableString,
    quantidade: optionalNumber,
    valor_unitario: optionalNumber,
    observacoes: nullableString,
    origem: nullableString,
    id_servico: nullableString,
    id_produto: nullableString,
    id_agendamento: nullableString,
    descricao: nullableString,
    custo_total: optionalNumber,
    id_profissional: nullableString,
    id_assistente: nullableString,
  })
  .partial();

const processarComandaBodySchema = z
  .object({
    idSalao: z.string().trim().min(1, "Salao obrigatorio."),
    acao: z.enum(COMANDA_ACTIONS),
    idempotencyKey: nullableString,
    comanda: comandaPayloadSchema.nullish(),
    item: itemPayloadSchema.nullish(),
  })
  .superRefine((body, ctx) => {
    const item = body.item || {};
    const comanda = body.comanda || {};

    if (body.acao === "criar_por_agendamento" && !item.id_agendamento) {
      ctx.addIssue({
        code: "custom",
        message: "Agendamento obrigatorio para abrir no caixa.",
        path: ["item", "id_agendamento"],
      });
    }

    if (body.acao === "salvar_base" && !comanda.numero) {
      ctx.addIssue({
        code: "custom",
        message: "Numero da comanda obrigatorio.",
        path: ["comanda", "numero"],
      });
    }

    if (body.acao === "adicionar_item" && !item.tipo_item) {
      ctx.addIssue({
        code: "custom",
        message: "Tipo do item obrigatorio para adicionar item.",
        path: ["item", "tipo_item"],
      });
    }

    if (body.acao === "editar_item") {
      if (!item.idItem) {
        ctx.addIssue({
          code: "custom",
          message: "Item obrigatorio para editar a comanda.",
          path: ["item", "idItem"],
        });
      }

      if (!comanda.idComanda) {
        ctx.addIssue({
          code: "custom",
          message: "Comanda obrigatoria para salvar item.",
          path: ["comanda", "idComanda"],
        });
      }
    }

    if (body.acao === "remover_item") {
      if (!item.idItem) {
        ctx.addIssue({
          code: "custom",
          message: "Item obrigatorio para remover.",
          path: ["item", "idItem"],
        });
      }

      if (!comanda.idComanda) {
        ctx.addIssue({
          code: "custom",
          message: "Comanda obrigatoria para remover item.",
          path: ["comanda", "idComanda"],
        });
      }
    }

    if (body.acao === "enviar_pagamento" && !comanda.idComanda) {
      ctx.addIssue({
        code: "custom",
        message: "Comanda obrigatoria para enviar ao pagamento.",
        path: ["comanda", "idComanda"],
      });
    }
  });

export class ProcessarComandaUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarComandaUseCaseError";
  }
}

export type ProcessarComandaInput = ProcessarComandaBody & {
  idSalao: string;
  acao: AcaoComanda;
  idempotencyKey?: string;
  comanda: NonNullable<ProcessarComandaBody["comanda"]>;
  item: NonNullable<ProcessarComandaBody["item"]>;
};

export type ProcessarComandaUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

function normalizeProcessarComandaBody(
  body: z.infer<typeof processarComandaBodySchema>
): ProcessarComandaInput {
  return {
    idSalao: sanitizeUuid(body.idSalao) || body.idSalao,
    acao: body.acao,
    idempotencyKey: sanitizeIdempotencyKey(body.idempotencyKey) || undefined,
    comanda: body.comanda || {},
    item: body.item || {},
  };
}

function mapActionError(acao: AcaoComanda, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Erro interno ao processar comanda.";

  if (acao === "criar_por_agendamento") {
    return new ProcessarComandaUseCaseError(
      message,
      message.includes("nao encontrado") ? 404 : resolveComandaHttpStatus(error)
    );
  }

  if (acao === "salvar_base") {
    return new ProcessarComandaUseCaseError(
      message,
      message.includes("Numero") ? 400 : resolveComandaHttpStatus(error)
    );
  }

  if (acao === "adicionar_item" || acao === "editar_item") {
    return new ProcessarComandaUseCaseError(
      message,
      message.includes("obrigatoria") ||
        message.includes("obrigatorio") ||
        message.includes("nao encontrado") ||
        message.includes("Selecione") ||
        message.includes("vinculado")
        ? 400
        : resolveComandaHttpStatus(error)
    );
  }

  if (acao === "remover_item") {
    return new ProcessarComandaUseCaseError(
      message,
      message.includes("obrigatorios") ? 400 : resolveComandaHttpStatus(error)
    );
  }

  return new ProcessarComandaUseCaseError(
    message,
    resolveComandaHttpStatus(error)
  );
}

export function parseProcessarComandaInput(body: unknown): ProcessarComandaInput {
  return normalizeProcessarComandaBody(processarComandaBodySchema.parse(body));
}

export async function processarComandaUseCase(params: {
  input: ProcessarComandaInput;
  service: ComandaService;
  actorUserId: string;
}): Promise<ProcessarComandaUseCaseResult> {
  const { input, service, actorUserId } = params;
  const { idSalao, acao, comanda, item, idempotencyKey } = input;

  try {
    if (acao === "criar_por_agendamento") {
      const idAgendamento = sanitizeUuid(item.id_agendamento);
      const data = await service.criarPorAgendamento({
        idSalao,
        idAgendamento: idAgendamento || "",
      });

      await service.registrarLog({
        gravidade: data.jaExistia ? "warning" : "info",
        idSalao,
        idUsuario: actorUserId,
        mensagem: data.jaExistia
          ? "Comanda de agendamento reaproveitada por idempotencia."
          : "Comanda criada a partir de agendamento.",
        detalhes: {
          acao,
          id_agendamento: idAgendamento,
          id_comanda: data.idComanda,
          ja_existia: data.jaExistia,
        },
      });

      return {
        status: 200,
        body: {
          ok: true,
          idComanda: data.idComanda,
          jaExistia: data.jaExistia,
        },
      };
    }

    if (acao === "salvar_base") {
      const data = await service.salvarBase({
        idSalao,
        comanda,
      });

      await service.registrarLog({
        gravidade: "info",
        idSalao,
        idUsuario: actorUserId,
        mensagem: "Base da comanda salva pelo servidor.",
        detalhes: {
          acao,
          id_comanda: data.idComanda,
          numero: data.numero,
          status: data.status,
        },
      });

      return {
        status: 200,
        body: { ok: true, idComanda: data.idComanda },
      };
    }

    if (acao === "adicionar_item") {
      const data = await service.adicionarItem({
        idSalao,
        comanda,
        item,
        idempotencyKey,
      });

      await service.registrarLog({
        gravidade: data.idempotentReplay ? "warning" : "info",
        idSalao,
        idUsuario: actorUserId,
        mensagem: data.idempotentReplay
          ? "Item de comanda reaproveitado por idempotencia."
          : "Item adicionado na comanda pelo servidor.",
        detalhes: {
          acao,
          id_comanda: data.idComanda,
          id_item: data.idItem || null,
          tipo_item: data.resolved.tipoItem,
          idempotency_key: data.idempotencyKey,
          ja_existia: data.idempotentReplay,
        },
      });

      return {
        status: 200,
        body: {
          ok: true,
          idComanda: data.idComanda,
          idItem: data.idItem,
          idempotentReplay: data.idempotentReplay,
        },
      };
    }

    if (acao === "editar_item") {
      const data = await service.editarItem({
        idSalao,
        comanda,
        item,
      });

      await service.registrarLog({
        gravidade: "info",
        idSalao,
        idUsuario: actorUserId,
        mensagem: "Item da comanda atualizado pelo servidor.",
        detalhes: {
          acao,
          id_comanda: data.idComanda,
          id_item: data.idItem,
          tipo_item: data.resolved.tipoItem,
        },
      });

      return {
        status: 200,
        body: {
          ok: true,
          idComanda: data.idComanda,
          idItem: data.idItem,
        },
      };
    }

    if (acao === "remover_item") {
      const data = await service.removerItem({
        idSalao,
        comanda,
        item,
      });

      await service.registrarLog({
        gravidade: "warning",
        idSalao,
        idUsuario: actorUserId,
        mensagem: "Item removido da comanda pelo servidor.",
        detalhes: {
          acao,
          id_comanda: data.idComanda,
          id_item: data.idItem,
        },
      });

      return {
        status: 200,
        body: { ok: true, idComanda: data.idComanda },
      };
    }

    const data = await service.enviarParaPagamento({
      idSalao,
      comanda,
    });

    await service.registrarLog({
      gravidade: "info",
      idSalao,
      idUsuario: actorUserId,
      mensagem: "Comanda enviada para pagamento pelo servidor.",
      detalhes: {
        acao,
        id_comanda: data.idComanda,
        status: data.status,
      },
    });

    return {
      status: 200,
      body: {
        ok: true,
        idComanda: data.idComanda,
        status: data.status,
      },
    };
  } catch (error) {
    throw mapActionError(acao, error);
  }
}
