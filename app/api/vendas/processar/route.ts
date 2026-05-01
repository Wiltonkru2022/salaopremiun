import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  ACOES_VENDA,
  AuthzError,
  carregarContextoVenda,
  getVendaErrorMessage,
  isAcaoVenda,
  PlanAccessError,
  resolveVendaHttpStatus,
} from "@/lib/vendas/processar";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  parseProcessarVendaInput,
  processarVendaUseCase,
  ProcessarVendaUseCaseError,
} from "@/core/use-cases/vendas/processarVenda";
import { createVendaService } from "@/services/vendaService";

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acao = "";

  try {
    const input = parseProcessarVendaInput(await req.json());
    idSalao = input.idSalao;
    acao = input.acao;

    // Guard: carregarContextoVenda() chama requireSalaoPermission antes de expor o client admin.
    const { membership, supabaseAdmin } = await carregarContextoVenda({
      idSalao,
      acao: input.acao,
    });

    const result = await processarVendaUseCase({
      input,
      actorUserId: membership.usuario.id,
      service: createVendaService(supabaseAdmin),
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

    if (error instanceof ProcessarVendaUseCaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await runAdminOperation({
          action: "api_vendas_processar_report_incident",
          idSalao,
          run: async (supabaseAdmin) => {
            await reportOperationalIncident({
              supabaseAdmin,
              key: `vendas:processar:${acao || "desconhecida"}:${idSalao}`,
              module: "vendas",
              title: "Processamento de venda falhou",
              description: getVendaErrorMessage(error),
              severity: "alta",
              idSalao,
              details: {
                acao: isAcaoVenda(acao) ? acao : null,
                route: "/api/vendas/processar",
                acoes_suportadas: ACOES_VENDA,
              },
            });
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de vendas:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar venda:", error);
    return NextResponse.json(
      {
        error: getVendaErrorMessage(error),
      },
      { status: resolveVendaHttpStatus(error) }
    );
  }
}
