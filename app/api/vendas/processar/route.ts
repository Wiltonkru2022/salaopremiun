import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import { reverterEstoqueComanda } from "@/lib/estoque/comanda-stock";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AcaoVenda = "detalhes" | "reabrir" | "excluir";

type BodyPayload = {
  idSalao?: string | null;
  acao?: AcaoVenda | null;
  idComanda?: string | null;
  motivo?: string | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

async function validarComandaVenda(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idComanda: string;
}) {
  const { supabaseAdmin, idSalao, idComanda } = params;

  const { data, error } = await supabaseAdmin
    .from("comandas")
    .select("id, id_salao, numero, status")
    .eq("id", idComanda)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("Venda nao encontrada para este salao.");
  }

  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyPayload;
    const idSalao = sanitizeUuid(body.idSalao);
    const idComanda = sanitizeUuid(body.idComanda);
    const acao = String(body.acao || "").trim().toLowerCase() as AcaoVenda;

    if (!idSalao || !idComanda) {
      return NextResponse.json(
        { error: "Salao e venda sao obrigatorios." },
        { status: 400 }
      );
    }

    if (!["detalhes", "reabrir", "excluir"].includes(acao)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const membership =
      acao === "detalhes"
        ? await requireSalaoPermission(idSalao, "vendas_ver")
        : await requireSalaoPermission(idSalao, "vendas_ver", {
            allowedNiveis: ["admin", "gerente"],
          });

    const supabaseAdmin = getSupabaseAdmin();

    await validarComandaVenda({
      supabaseAdmin,
      idSalao,
      idComanda,
    });

    if (acao === "detalhes") {
      const { data, error } = await supabaseAdmin.rpc("fn_detalhes_venda", {
        p_id_comanda: idComanda,
      });

      if (error) {
        console.error("Erro ao carregar detalhes da venda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao carregar detalhes da venda." },
          { status: resolveHttpStatus(error) }
        );
      }

      return NextResponse.json({ ok: true, detalhe: data || null });
    }

    if (acao === "reabrir") {
      const { error } = await supabaseAdmin.rpc("fn_reabrir_venda_para_caixa", {
        p_id_comanda: idComanda,
        p_motivo: sanitizeText(body.motivo),
        p_reopened_by: membership.user.id,
      });

      if (error) {
        console.error("Erro ao reabrir venda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao reabrir venda." },
          { status: resolveHttpStatus(error) }
        );
      }

      let warning: string | null = null;

      try {
        const estoqueResult = await reverterEstoqueComanda(supabaseAdmin, {
          idSalao,
          idComanda,
        });

        if (estoqueResult.skipped && estoqueResult.reason) {
          warning = estoqueResult.reason;
        }
      } catch (estoqueError) {
        warning =
          estoqueError instanceof Error
            ? estoqueError.message
            : "nao foi possivel devolver o estoque da venda.";
      }

      return NextResponse.json({ ok: true, warning });
    }

    const { error } = await supabaseAdmin.rpc("fn_excluir_venda_completa", {
      p_id_comanda: idComanda,
      p_motivo: sanitizeText(body.motivo),
      p_deleted_by: membership.user.id,
    });

    if (error) {
      console.error("Erro ao excluir venda:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao excluir venda." },
        { status: resolveHttpStatus(error) }
      );
    }

    let warning: string | null = null;

    try {
      const estoqueResult = await reverterEstoqueComanda(supabaseAdmin, {
        idSalao,
        idComanda,
      });

      if (estoqueResult.skipped && estoqueResult.reason) {
        warning = estoqueResult.reason;
      }
    } catch (estoqueError) {
      warning =
        estoqueError instanceof Error
          ? estoqueError.message
          : "nao foi possivel devolver o estoque da venda.";
    }

    return NextResponse.json({ ok: true, warning });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro geral ao processar venda:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar venda.",
      },
      { status: 500 }
    );
  }
}
