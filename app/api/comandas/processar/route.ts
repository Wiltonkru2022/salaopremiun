import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import { COMANDA_ACTIONS, resolveComandaHttpStatus } from "@/lib/comandas/processar";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  parseProcessarComandaInput,
  processarComandaUseCase,
  ProcessarComandaUseCaseError,
} from "@/core/use-cases/comandas/processarComanda";
import { createComandaService } from "@/services/comandaService";

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acao = "";

  try {
    const input = parseProcessarComandaInput(await req.json());
    idSalao = input.idSalao;
    acao = input.acao;

    const permissionMembership = await requireSalaoPermission(
      idSalao,
      "comandas_ver"
    );
    await assertCanMutatePlanFeature(idSalao, "comandas");

    const result = await processarComandaUseCase({
      input,
      actorUserId: permissionMembership.usuario.id,
      service: createComandaService(),
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

    if (error instanceof ProcessarComandaUseCaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `comandas:processar:${acao || "desconhecida"}:${idSalao}`,
          module: "comandas",
          title: "Processamento de comanda falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar comanda.",
          severity: "alta",
          idSalao,
          details: {
            acao: COMANDA_ACTIONS.includes(acao as never) ? acao : null,
            route: "/api/comandas/processar",
            acoes_suportadas: COMANDA_ACTIONS,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de comandas:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar comanda:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar comanda." },
      { status: resolveComandaHttpStatus(error) }
    );
  }
}
