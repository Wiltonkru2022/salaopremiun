import { NextRequest, NextResponse } from "next/server";
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
import { registrarLogSistema } from "@/lib/system-logs";

type BodyPayload = {
  idSalao?: string | null;
  acao?: "movimentacao_manual" | null;
  movimentacao?: {
    idProduto?: string | null;
    tipo?: string | null;
    origem?: string | null;
    quantidade?: number | null;
    valorUnitario?: number | null;
    observacoes?: string | null;
  } | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

export async function POST(req: NextRequest) {
  let idSalao = "";

  try {
    const body = (await req.json()) as BodyPayload;
    idSalao = sanitizeUuid(body.idSalao) || "";

    if (!idSalao) {
      return NextResponse.json({ error: "Salao obrigatorio." }, { status: 400 });
    }

    if (body.acao !== "movimentacao_manual") {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const membership = await requireSalaoPermission(idSalao, "estoque_ver", {
      allowedNiveis: ["admin", "gerente"],
    });
    await assertCanMutatePlanFeature(idSalao, "estoque");

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc(
      "fn_registrar_movimentacao_estoque_manual",
      {
        p_id_salao: idSalao,
        p_id_produto: sanitizeUuid(body.movimentacao?.idProduto),
        p_id_usuario: membership.user.id,
        p_tipo: sanitizeText(body.movimentacao?.tipo),
        p_origem: sanitizeText(body.movimentacao?.origem),
        p_quantidade: sanitizeMoney(body.movimentacao?.quantidade),
        p_valor_unitario: sanitizeMoney(body.movimentacao?.valorUnitario),
        p_observacoes: sanitizeText(body.movimentacao?.observacoes),
      }
    );

    if (error) {
      console.error("Erro ao registrar movimentacao manual de estoque:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao registrar movimentacao." },
        { status: resolveHttpStatus(error) }
      );
    }

    const resultRow = Array.isArray(data) ? data[0] : data;

    await registrarLogSistema({
      gravidade: "info",
      modulo: "estoque",
      idSalao,
      idUsuario: membership.usuario.id,
      mensagem: "Movimentacao manual de estoque registrada.",
      detalhes: {
        acao: "movimentacao_manual",
        id_produto: sanitizeUuid(body.movimentacao?.idProduto),
        tipo: sanitizeText(body.movimentacao?.tipo),
        origem: sanitizeText(body.movimentacao?.origem),
        quantidade: sanitizeMoney(body.movimentacao?.quantidade),
        estoque_atual: resultRow?.estoque_atual ?? null,
        id_movimentacao: resultRow?.id_movimentacao || null,
      },
    });

    return NextResponse.json({
      ok: true,
      idMovimentacao: resultRow?.id_movimentacao || null,
      estoqueAtual: resultRow?.estoque_atual ?? null,
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
          key: `estoque:movimentacao_manual:${idSalao}`,
          module: "estoque",
          title: "Movimentacao manual de estoque falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar estoque.",
          severity: "alta",
          idSalao,
          details: {
            route: "/api/estoque/processar",
            acao: "movimentacao_manual",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de estoque:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar estoque:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar estoque.",
      },
      { status: 500 }
    );
  }
}
