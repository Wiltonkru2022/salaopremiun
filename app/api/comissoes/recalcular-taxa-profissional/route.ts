import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseRecalcularTaxaProfissionalInput,
  recalcularTaxaProfissionalUseCase,
  RecalcularTaxaProfissionalUseCaseError,
} from "@/core/use-cases/comissoes/recalcularTaxaProfissional";
import {
  AuthzError,
  createComissaoTaxaRouteService,
} from "@/services/comissaoTaxaRouteService";
import { createComissaoTaxaService } from "@/services/comissaoTaxaService";

const routeService = createComissaoTaxaRouteService();

export async function POST(req: NextRequest) {
  let idSalao = "";
  let idComanda = "";

  try {
    const input = parseRecalcularTaxaProfissionalInput(await req.json());
    idSalao = input.idSalao;
    idComanda = input.idComanda;

    await routeService.validarPermissao(idSalao);

    const result = await recalcularTaxaProfissionalUseCase({
      input,
      service: createComissaoTaxaService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || "Payload invalido.",
          issues: error.flatten(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof RecalcularTaxaProfissionalUseCaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      await routeService.reportarFalha({
        idSalao,
        idComanda,
        error,
      });
    }

    return NextResponse.json(
      { error: "Erro interno ao recalcular taxa do profissional." },
      { status: 500 }
    );
  }
}
