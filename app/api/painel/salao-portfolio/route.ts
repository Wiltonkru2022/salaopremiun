import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadSalaoPublicAsset } from "@/services/salaoPublicAssetsService";

const MAX_PORTFOLIO_FOTOS = 12;

function mapPortfolioFoto(row: Record<string, unknown>) {
  return {
    id: String(row.id || ""),
    imagemUrl: String(row.imagem_url || ""),
    legenda: String(row.legenda || "").trim(),
    ordem: Number(row.ordem || 0),
  };
}

async function requireSalaoContext() {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return {
      error: NextResponse.json(
        { message: "Sessao expirada. Entre novamente para gerenciar o portfolio." },
        { status: 401 }
      ),
      idSalao: null,
    };
  }

  return { error: null, idSalao: usuario.id_salao };
}

export async function GET() {
  const context = await requireSalaoContext();
  if (context.error) return context.error;
  if (!context.idSalao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para gerenciar o portfolio." },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await (supabaseAdmin as any)
    .from("salao_portfolio_fotos")
    .select("id, imagem_url, legenda, ordem")
    .eq("id_salao", context.idSalao)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { message: "Nao foi possivel carregar o portfolio." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    fotos: ((data || []) as Array<Record<string, unknown>>).map(mapPortfolioFoto),
  });
}

export async function POST(request: Request) {
  const context = await requireSalaoContext();
  if (context.error) return context.error;
  if (!context.idSalao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para gerenciar o portfolio." },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { count, error: countError } = await (supabaseAdmin as any)
    .from("salao_portfolio_fotos")
    .select("id", { count: "exact", head: true })
    .eq("id_salao", context.idSalao)
    .eq("ativo", true);

  if (countError) {
    return NextResponse.json(
      { message: "Nao foi possivel validar o limite do portfolio." },
      { status: 500 }
    );
  }

  if ((count || 0) >= MAX_PORTFOLIO_FOTOS) {
    return NextResponse.json(
      { message: "O portfolio aceita ate 12 fotos por salao." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const legenda = String(formData.get("legenda") || "").trim().slice(0, 90);

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Selecione uma imagem valida." },
      { status: 400 }
    );
  }

  try {
    const publicUrl = await uploadSalaoPublicAsset({
      idSalao: context.idSalao,
      tipo: "portfolio",
      file,
    });

    const { data, error } = await (supabaseAdmin as any)
      .from("salao_portfolio_fotos")
      .insert({
        id_salao: context.idSalao,
        imagem_url: publicUrl,
        legenda: legenda || null,
        ordem: count || 0,
        ativo: true,
      })
      .select("id, imagem_url, legenda, ordem")
      .single();

    if (error) throw error;

    return NextResponse.json({ foto: mapPortfolioFoto(data) });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel enviar a foto do portfolio.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const context = await requireSalaoContext();
  if (context.error) return context.error;
  if (!context.idSalao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para gerenciar o portfolio." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json(
      { message: "Informe a foto que deseja remover." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await (supabaseAdmin as any)
    .from("salao_portfolio_fotos")
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("id_salao", context.idSalao);

  if (error) {
    return NextResponse.json(
      { message: "Nao foi possivel remover a foto do portfolio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
