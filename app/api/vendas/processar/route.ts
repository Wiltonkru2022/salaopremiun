import { NextRequest, NextResponse } from "next/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  ACOES_VENDA,
  AuthzError,
  carregarContextoVenda,
  excluirVenda,
  isAcaoVenda,
  obterDetalhesVenda,
  PlanAccessError,
  reabrirVenda,
  resolveVendaHttpStatus,
  sanitizeUuid,
  validarComandaVenda,
} from "@/lib/vendas/processar";
import type { VendaProcessarBody } from "@/types/vendas";

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acao = "";

  try {
    const body = (await req.json()) as VendaProcessarBody;
    idSalao = sanitizeUuid(body.idSalao) || "";
    const idComanda = sanitizeUuid(body.idComanda);
    acao = String(body.acao || "").trim().toLowerCase();

    if (!idSalao || !idComanda) {
      return NextResponse.json(
        { error: "Salao e venda sao obrigatorios." },
        { status: 400 }
      );
    }

    if (!isAcaoVenda(acao)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const { membership, supabaseAdmin } = await carregarContextoVenda({
      idSalao,
      acao,
    });

    await validarComandaVenda({
      supabaseAdmin,
      idSalao,
      idComanda,
    });

    if (acao === "detalhes") {
      const data = await obterDetalhesVenda({
        supabaseAdmin,
        idComanda,
      });

      return NextResponse.json({ ok: true, ...data });
    }

    if (acao === "reabrir") {
      const data = await reabrirVenda({
        supabaseAdmin,
        idSalao,
        idComanda,
        motivo: body.motivo,
        idUsuario: membership.usuario.id,
      });

      return NextResponse.json({ ok: true, ...data });
    }

    const data = await excluirVenda({
      supabaseAdmin,
      idSalao,
      idComanda,
      motivo: body.motivo,
      idUsuario: membership.usuario.id,
    });

    return NextResponse.json({ ok: true, ...data });
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
        const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `vendas:processar:${acao || "desconhecida"}:${idSalao}`,
          module: "vendas",
          title: "Processamento de venda falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar venda.",
          severity: "alta",
          idSalao,
          details: {
            acao: isAcaoVenda(acao) ? acao : null,
            route: "/api/vendas/processar",
            acoes_suportadas: ACOES_VENDA,
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
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar venda.",
      },
      { status: resolveVendaHttpStatus(error) }
    );
  }
}
