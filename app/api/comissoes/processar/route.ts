import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registrarLogSistema } from "@/lib/system-logs";

type Body = {
  idSalao?: string;
  ids?: string[];
  acao?: "marcar_pago" | "cancelar";
};

type ProcessamentoRow = {
  total_lancamentos: number | string | null;
  total_vales: number | string | null;
  total_profissionais_com_vales: number | string | null;
  ids_processados: string[] | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];

  return Array.from(
    new Set(
      ids
        .map((value) => String(value || "").trim())
        .filter((value) => UUID_REGEX.test(value))
    )
  );
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const idSalao = sanitizeUuid(body.idSalao);
    const ids = sanitizeIds(body.ids);
    const acao = String(body.acao || "").trim().toLowerCase();

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

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc(
      "fn_processar_comissoes_lancamentos",
      {
        p_id_salao: idSalao,
        p_ids: ids,
        p_acao: acao,
      }
    );

    if (error) {
      console.error("Erro ao processar comissoes:", error);
      return NextResponse.json(
        {
          error:
            error.message || "Erro ao processar lancamentos de comissao.",
        },
        { status: resolveHttpStatus(error) }
      );
    }

    const row = Array.isArray(data)
      ? (data[0] as ProcessamentoRow | undefined)
      : (data as ProcessamentoRow | null);
    const totalLancamentos = Number(row?.total_lancamentos || 0);
    const totalVales = Number(row?.total_vales || 0);
    const totalProfissionaisComVales = Number(
      row?.total_profissionais_com_vales || 0
    );
    const idsProcessados = row?.ids_processados || [];

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

    console.error("Erro geral ao processar comissoes:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar comissoes." },
      { status: 500 }
    );
  }
}
