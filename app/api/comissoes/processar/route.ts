import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import {
  processarLancamentosComissao,
  resolveComissoesHttpStatus,
  sanitizeIds,
  sanitizeUuid,
} from "@/lib/comissoes/processar-lancamentos";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";

type Body = {
  idSalao?: string;
  ids?: string[];
  acao?: "marcar_pago" | "cancelar";
};

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acao = "";

  try {
    const body = (await req.json()) as Body;
    idSalao = sanitizeUuid(body.idSalao) || "";
    const ids = sanitizeIds(body.ids);
    acao = String(body.acao || "").trim().toLowerCase();

    if (!idSalao) {
      return NextResponse.json(
        { error: "Salao obrigatorio." },
        { status: 400 }
      );
    }

    if (!["marcar_pago", "cancelar"].includes(acao)) {
      return NextResponse.json(
        { error: "Acao invalida." },
        { status: 400 }
      );
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Nenhum lancamento valido informado." },
        { status: 400 }
      );
    }

    const membership = await requireSalaoPermission(idSalao, "comissoes_ver");
    await assertCanMutatePlanFeature(idSalao, "comissoes_basicas");

    const supabaseAdmin = getSupabaseAdmin();
    const {
      totalLancamentos,
      totalVales,
      totalProfissionaisComVales,
      idsProcessados,
    } = await processarLancamentosComissao({
      supabaseAdmin,
      idSalao,
      ids,
      acao: acao as "marcar_pago" | "cancelar",
    });

    await registrarLogSistema({
      gravidade: acao === "cancelar" ? "warning" : "info",
      modulo: "comissoes",
      idSalao,
      idUsuario: membership.usuario.id,
      mensagem:
        acao === "cancelar"
          ? "Lancamentos de comissao cancelados pelo servidor."
          : "Lancamentos de comissao marcados como pagos pelo servidor.",
      detalhes: {
        acao,
        total_lancamentos: totalLancamentos,
        total_vales: totalVales,
        total_profissionais_com_vales: totalProfissionaisComVales,
        ids_solicitados: ids.length,
        ids_processados: idsProcessados,
      },
    });

    return NextResponse.json({
      ok: true,
      acao,
      totalLancamentos,
      totalVales,
      totalProfissionaisComVales,
      idsProcessados,
    });
  } catch (error) {
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
      { status: resolveComissoesHttpStatus(error) }
    );
  }
}
