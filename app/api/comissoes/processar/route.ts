import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  parseProcessarComissoesInput,
  processarComissoesUseCase,
  ProcessarComissoesUseCaseError,
} from "@/core/use-cases/comissoes/processarComissoes";
import { createComissaoService } from "@/services/comissaoService";

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acao = "";

  try {
    const input = parseProcessarComissoesInput(await req.json());
    idSalao = input.idSalao;
    acao = input.acao;

    const membership = await requireSalaoPermission(idSalao, "comissoes_ver");
    await assertCanMutatePlanFeature(idSalao, "comissoes_basicas");

    const result = await processarComissoesUseCase({
      input,
      idUsuario: membership.usuario.id,
      service: createComissaoService(),
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

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof ProcessarComissoesUseCaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `comissoes:processar:${acao || "desconhecida"}:${idSalao}`,
          module: "comissoes",
          title: "Processamento de comissoes falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar comissoes.",
          severity: "alta",
          idSalao,
          details: {
            acao: acao || null,
            route: "/api/comissoes/processar",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de comissoes:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar comissoes:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar comissoes." },
      { status: 500 }
    );
  }
}
