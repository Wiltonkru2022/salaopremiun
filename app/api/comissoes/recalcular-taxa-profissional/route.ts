import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  recalcularTaxaProfissional,
  validarPermissaoRecalculoComissao,
} from "@/lib/comissoes/recalcular-taxa-profissional";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  idSalao: string;
  idComanda: string;
};

export async function POST(req: NextRequest) {
  let idSalao = "";
  let idComanda = "";

  try {
    const body = (await req.json()) as Body;
    idSalao = String(body.idSalao || "").trim();
    idComanda = String(body.idComanda || "").trim();

    if (!idSalao || !idComanda) {
      return NextResponse.json(
        { error: "Salao e comanda sao obrigatorios." },
        { status: 400 }
      );
    }

    await validarPermissaoRecalculoComissao(idSalao);

    const result = await recalcularTaxaProfissional({
      supabaseAdmin: getSupabaseAdmin(),
      idSalao,
      idComanda,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `comissoes:recalcular-taxa:${idSalao}:${idComanda || "sem-comanda"}`,
          module: "comissoes",
          title: "Recalculo de taxa profissional falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao recalcular taxa do profissional.",
          severity: "alta",
          idSalao,
          details: {
            id_comanda: idComanda || null,
            route: "/api/comissoes/recalcular-taxa-profissional",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de recálculo de comissão:",
          incidentError
        );
      }
    }

    console.error("Erro interno ao recalcular taxa do profissional:", error);
    return NextResponse.json(
      { error: "Erro interno ao recalcular taxa do profissional." },
      { status: 500 }
    );
  }
}
