import { z } from "zod";
import type { ComissaoTaxaService } from "@/services/comissaoTaxaService";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

const recalcularTaxaBodySchema = z.object({
  idSalao: z.string().trim().min(1, "Salao obrigatorio."),
  idComanda: z.string().trim().min(1, "Comanda obrigatoria."),
});

export class RecalcularTaxaProfissionalUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RecalcularTaxaProfissionalUseCaseError";
  }
}

export type RecalcularTaxaProfissionalInput = {
  idSalao: string;
  idComanda: string;
};

export type RecalcularTaxaProfissionalUseCaseResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseRecalcularTaxaProfissionalInput(
  body: unknown
): RecalcularTaxaProfissionalInput {
  const parsed = recalcularTaxaBodySchema.parse(body);
  const idSalao = sanitizeUuid(parsed.idSalao) || "";
  const idComanda = sanitizeUuid(parsed.idComanda) || "";

  if (!idSalao || !idComanda) {
    throw new RecalcularTaxaProfissionalUseCaseError(
      "Salao e comanda sao obrigatorios.",
      400
    );
  }

  return {
    idSalao,
    idComanda,
  };
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514" || candidate.code === "23503") return 409;
  return 500;
}

export async function recalcularTaxaProfissionalUseCase(params: {
  input: RecalcularTaxaProfissionalInput;
  service: ComissaoTaxaService;
}): Promise<RecalcularTaxaProfissionalUseCaseResult> {
  try {
    const result = await params.service.recalcular({
      idSalao: params.input.idSalao,
      idComanda: params.input.idComanda,
    });

    return {
      status: 200,
      body: result,
    };
  } catch (error) {
    throw new RecalcularTaxaProfissionalUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro interno ao recalcular taxa do profissional.",
      resolveHttpStatus(error)
    );
  }
}
