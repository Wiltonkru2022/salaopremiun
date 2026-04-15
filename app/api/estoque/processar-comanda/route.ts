import { NextRequest, NextResponse } from "next/server";
import { AuthzError, requireSalaoMembership } from "@/lib/auth/require-salao-membership";
import { processarEstoqueComanda } from "@/lib/estoque/comanda-stock";
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

    const auth = await requireSalaoMembership(idSalao);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: comanda, error: comandaError } = await supabaseAdmin
      .from("comandas")
      .select("id, status, id_salao")
      .eq("id", idComanda)
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (comandaError) {
      throw comandaError;
    }

    if (!comanda?.id) {
      return NextResponse.json(
        { error: "Comanda nao encontrada." },
        { status: 404 }
      );
    }

    if (String(comanda.status || "").toLowerCase() !== "fechada") {
      return NextResponse.json(
        { error: "A comanda precisa estar fechada para baixar estoque." },
        { status: 409 }
      );
    }

    const result = await processarEstoqueComanda(supabaseAdmin, {
      idSalao,
      idComanda,
      idUsuario: auth.usuario.id,
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
            : "Erro interno ao processar o estoque da comanda.",
      },
      { status: 500 }
    );
  }
}
