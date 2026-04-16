import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const idSalao = String(body.idSalao || "").trim();
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

    await requireSalaoPermission(idSalao, "comissoes_ver");

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
        { error: "Erro ao processar lancamentos de comissao." },
        { status: 500 }
      );
    }

    const row = Array.isArray(data)
      ? (data[0] as ProcessamentoRow | undefined)
      : (data as ProcessamentoRow | null);

    return NextResponse.json({
      ok: true,
      acao,
      totalLancamentos: Number(row?.total_lancamentos || 0),
      totalVales: Number(row?.total_vales || 0),
      totalProfissionaisComVales: Number(
        row?.total_profissionais_com_vales || 0
      ),
      idsProcessados: row?.ids_processados || [],
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
