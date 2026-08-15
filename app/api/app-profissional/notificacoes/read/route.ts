import { NextResponse } from "next/server";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const validation = await validateProfissionalAppSession();
    if (!validation.context) {
      return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { id?: unknown };
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Notificacao invalida." }, { status: 400 });
    }

    const context = validation.context;
    const supabase = getSupabaseAdmin() as any;
    const { data: notification, error: loadError } = await supabase
      .from("notification_jobs")
      .select("id, metadata")
      .eq("id", id)
      .eq("id_salao", context.idSalao)
      .eq("id_profissional", context.idProfissional)
      .eq("canal", "profissional_app")
      .maybeSingle();

    if (loadError) throw loadError;
    if (!notification?.id) {
      return NextResponse.json({ ok: false, error: "Notificacao nao encontrada." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notification_jobs")
      .update({
        metadata: { ...(notification.metadata || {}), profissional_lida_em: now },
        updated_at: now,
      })
      .eq("id", id)
      .eq("id_salao", context.idSalao)
      .eq("id_profissional", context.idProfissional)
      .eq("canal", "profissional_app");

    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, readAt: now });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nao foi possivel marcar a notificacao como lida." },
      { status: 500 }
    );
  }
}
