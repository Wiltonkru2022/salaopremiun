import { z } from "zod";
import type { ComissaoService, ProcessarComissoesAcao } from "@/services/comissaoService";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];

  return Array.from(
    new Set(
      ids
        .map((value) => String(value || "").trim())
        .filter((value) => UUID_REGEX.test(value))
    )
  );
}

function resolveComissoesHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

const processarComissoesBodySchema = z.object({
  idSalao: z.string().trim().min(1, "Salao obrigatorio."),
  ids: z.array(z.unknown()).min(1, "Nenhum lancamento informado."),
  acao: z.enum(["marcar_pago", "cancelar"]),
});

export class ProcessarComissoesUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProcessarComissoesUseCaseError";
  }
}

export type ProcessarComissoesInput = {
  idSalao: string;
  ids: string[];
  acao: ProcessarComissoesAcao;
};

export type ProcessarComissoesUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseProcessarComissoesInput(
  body: unknown
): ProcessarComissoesInput {
  const parsed = processarComissoesBodySchema.parse(body);
  const idSalao = sanitizeUuid(parsed.idSalao) || "";
  const ids = sanitizeIds(parsed.ids);

  if (!idSalao) {
    throw new ProcessarComissoesUseCaseError("Salao obrigatorio.", 400);
  }

  if (ids.length === 0) {
    throw new ProcessarComissoesUseCaseError(
      "Nenhum lancamento valido informado.",
      400
    );
  }

  return {
    idSalao,
    ids,
    acao: parsed.acao,
  };
}

export async function processarComissoesUseCase(params: {
  input: ProcessarComissoesInput;
  idUsuario: string;
  service: ComissaoService;
}): Promise<ProcessarComissoesUseCaseResult> {
  const { input, idUsuario, service } = params;

  try {
    const {
      totalLancamentos,
      totalVales,
      totalProfissionaisComVales,
      idsProcessados,
    } = await service.processarLancamentos({
      idSalao: input.idSalao,
      ids: input.ids,
      acao: input.acao,
    });

    await service.registrarLogProcessamento({
      idSalao: input.idSalao,
      idUsuario,
      acao: input.acao,
      totalLancamentos,
      totalVales,
      totalProfissionaisComVales,
      idsSolicitados: input.ids.length,
      idsProcessados,
    });

    return {
      status: 200,
      body: {
        ok: true,
        acao: input.acao,
        totalLancamentos,
        totalVales,
        totalProfissionaisComVales,
        idsProcessados,
      },
    };
  } catch (error) {
    throw new ProcessarComissoesUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao processar comissoes.",
      resolveComissoesHttpStatus(error)
    );
  }
}
