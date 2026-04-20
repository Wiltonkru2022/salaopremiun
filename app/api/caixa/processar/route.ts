import { NextRequest, NextResponse } from "next/server";
import { AuthzError } from "@/lib/auth/require-salao-permission";
import {
  ACOES_CAIXA,
  criarContextoCaixa,
  isAcaoCaixa,
  processarAcaoCaixa,
} from "@/lib/caixa/processar/dispatcher";
import type { CaixaProcessarBody } from "@/lib/caixa/processar/types";
import {
  CaixaInputError,
  resolveHttpStatus,
  sanitizeUuid,
} from "@/lib/caixa/processar/utils";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const body = (await req.json()) as CaixaProcessarBody;
    idSalao = sanitizeUuid(body.idSalao) || "";
    acaoRaw = String(body.acao || "").trim().toLowerCase();

    if (!idSalao) {
      return NextResponse.json(
        { error: "Salao obrigatorio." },
        { status: 400 }
      );
    }

    if (!isAcaoCaixa(acaoRaw)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const { ctx } = await criarContextoCaixa({ idSalao, acao: acaoRaw });
    await assertCanMutatePlanFeature(idSalao, "caixa");

    const result = await processarAcaoCaixa({
      ctx,
      body,
      acao: acaoRaw,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof CaixaInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `caixa:processar:${acaoRaw || "desconhecida"}:${idSalao}`,
          module: "caixa",
          title: "Processamento de caixa falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar acao do caixa.",
          severity: "alta",
          idSalao,
          details: {
            acao: isAcaoCaixa(acaoRaw) ? acaoRaw : null,
            route: "/api/caixa/processar",
            acoes_suportadas: ACOES_CAIXA,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de caixa:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar caixa:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar acao do caixa.",
      },
      { status: resolveHttpStatus(error) }
    );
  }
}
