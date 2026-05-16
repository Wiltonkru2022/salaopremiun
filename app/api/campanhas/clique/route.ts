import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const idCampanha = String(payload.idCampanha || "").trim();
    const idSalao = String(payload.idSalao || "").trim();

    if (!idCampanha || !idSalao) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: campanha } = await (supabase as any)
      .from("cupons_salao")
      .select("id, id_salao, ativo")
      .eq("id", idCampanha)
      .eq("id_salao", idSalao)
      .limit(1)
      .maybeSingle();

    if (!campanha?.id) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    await (supabase as any).from("campanha_eventos").insert({
      id_salao: idSalao,
      id_cupom: idCampanha,
      tipo: "clique",
      metadata: {
        origem: String(payload.origem || "link_publico").slice(0, 80),
        slug: payload.slug ? String(payload.slug).slice(0, 120) : null,
        token: payload.token ? String(payload.token).slice(0, 120) : null,
        href: payload.href ? String(payload.href).slice(0, 500) : null,
        referrer: payload.referrer ? String(payload.referrer).slice(0, 500) : null,
        user_agent: payload.userAgent ? String(payload.userAgent).slice(0, 500) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
