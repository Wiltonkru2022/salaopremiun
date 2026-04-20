import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoMembership,
} from "@/lib/auth/require-salao-membership";
import {
  reverterEstoqueComanda,
  validarComandaParaEstoque,
} from "@/lib/estoque/comanda-stock";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";

type BodyPayload = {
  idSalao: string;
  idComanda: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

export async function POST(req: NextRequest) {
  let idSalao = "";
  let idComanda = "";

  try {
    const body = (await req.json()) as BodyPayload;
    idSalao = sanitizeUuid(body.idSalao) || "";
    idComanda = sanitizeUuid(body.idComanda) || "";

    if (!idSalao || !idComanda) {
      return NextResponse.json(
        { error: "Salao e comanda sao obrigatorios." },
        { status: 400 }
      );
    }

    const auth = await requireSalaoMembership(idSalao, {
      allowedNiveis: ["admin", "gerente"],
    });
    const supabaseAdmin = getSupabaseAdmin();

    await validarComandaParaEstoque({
      supabaseAdmin,
      idSalao,
      idComanda,
    });

    const result = await reverterEstoqueComanda(supabaseAdmin, {
      idSalao,
      idComanda,
      idUsuario: auth.usuario.id,
      sourceModule: "estoque",
      sourceAction: "reverter_comanda",
    });

    await registrarLogSistema({
      gravidade: result.skipped ? "warning" : "info",
      modulo: "estoque",
      idSalao,
      idUsuario: auth.usuario.id,
      mensagem: result.skipped
        ? "Reversao de estoque da comanda ignorada."
        : "Estoque da comanda revertido pelo servidor.",
      detalhes: {
        acao: "reverter_comanda",
        id_comanda: idComanda,
        reverted: Boolean(result.reverted),
        skipped: Boolean(result.skipped),
        reason: result.reason || null,
        movements: result.movements || 0,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (idSalao && idComanda) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `estoque:reverter_comanda:${idSalao}:${idComanda}`,
          module: "estoque",
          title: "Reversao de estoque da comanda falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao reverter o estoque da comanda.",
          severity: "alta",
          idSalao,
          details: {
            route: "/api/estoque/reverter-comanda",
            acao: "reverter_comanda",
            id_comanda: idComanda,
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente de reversao de estoque:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao reverter estoque da comanda:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao reverter o estoque da comanda.",
      },
      { status: 500 }
    );
  }
}
