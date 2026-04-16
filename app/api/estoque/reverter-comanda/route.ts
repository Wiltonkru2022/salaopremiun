import { NextRequest, NextResponse } from "next/server";
import { AuthzError, requireSalaoMembership } from "@/lib/auth/require-salao-membership";
import { reverterEstoqueComanda } from "@/lib/estoque/comanda-stock";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type BodyPayload = {
  idSalao: string;
  idComanda: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyPayload;
    const idSalao = String(body.idSalao || "").trim();
    const idComanda = String(body.idComanda || "").trim();

    if (!idSalao || !idComanda) {
      return NextResponse.json(
        { error: "Salao e comanda sao obrigatorios." },
        { status: 400 }
      );
    }

    await requireSalaoMembership(idSalao, {
      allowedNiveis: ["admin", "gerente"],
    });

    const result = await reverterEstoqueComanda(getSupabaseAdmin(), {
      idSalao,
      idComanda,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

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
