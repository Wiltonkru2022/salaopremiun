import { z } from "zod";
import {
  ACOES_VENDA,
  getVendaErrorMessage,
  resolveVendaHttpStatus,
  sanitizeText,
  sanitizeUuid,
} from "@/lib/vendas/processar";
import type { VendaService } from "@/services/vendaService";
import type { AcaoVenda, VendaProcessarBody } from "@/types/vendas";

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : undefined));

const processarVendaBodySchema = z.object({
  idSalao: z.string().trim().min(1, "Salao obrigatorio."),
  acao: z.enum(ACOES_VENDA),
  idComanda: z.string().trim().min(1, "Venda obrigatoria."),
  motivo: nullableString,
});

export class ProcessarVendaUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarVendaUseCaseError";
  }
}

export type ProcessarVendaInput = VendaProcessarBody & {
  idSalao: string;
  acao: AcaoVenda;
  idComanda: string;
  motivo?: string;
};

export type ProcessarVendaUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseProcessarVendaInput(body: unknown): ProcessarVendaInput {
  const parsed = processarVendaBodySchema.parse(body);

  return {
    idSalao: sanitizeUuid(parsed.idSalao) || parsed.idSalao,
    acao: parsed.acao,
    idComanda: sanitizeUuid(parsed.idComanda) || parsed.idComanda,
    motivo: sanitizeText(parsed.motivo) || undefined,
  };
}

export async function processarVendaUseCase(params: {
  input: ProcessarVendaInput;
  actorUserId: string;
  service: VendaService;
}): Promise<ProcessarVendaUseCaseResult> {
  const { input, actorUserId, service } = params;
  const { idSalao, acao, idComanda, motivo } = input;

  try {
    await service.validarComanda({
      idSalao,
      idComanda,
    });

    if (acao === "detalhes") {
      const data = await service.obterDetalhes({ idComanda });
      return {
        status: 200,
        body: { ok: true, ...data },
      };
    }

    if (acao === "reabrir") {
      const data = await service.reabrir({
        idSalao,
        idComanda,
        motivo,
        idUsuario: actorUserId,
      });

      return {
        status: 200,
        body: { ok: true, ...data },
      };
    }

    const data = await service.excluir({
      idSalao,
      idComanda,
      motivo,
      idUsuario: actorUserId,
    });

    return {
      status: 200,
      body: { ok: true, ...data },
    };
  } catch (error) {
    throw new ProcessarVendaUseCaseError(
      getVendaErrorMessage(error),
      resolveVendaHttpStatus(error)
    );
  }
}
