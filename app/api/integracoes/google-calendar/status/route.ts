import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar/oauth";
import { canUsePlanFeature } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401 }
    );
  }

  const feature = await canUsePlanFeature(usuario.id_salao, "google_calendar");
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from("saloes_google_calendar_connections")
    .select("google_email, calendar_id, connected_at, updated_at, ativo")
    .eq("id_salao", usuario.id_salao)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      ok: true,
      configured: isGoogleCalendarConfigured(),
      allowed: feature.allowed,
      blockReason: feature.reason,
      connected: false,
      googleEmail: null,
    });
  }

  return NextResponse.json({
    ok: true,
    configured: isGoogleCalendarConfigured(),
    allowed: feature.allowed,
    blockReason: feature.reason,
    connected: Boolean(data),
    googleEmail: data?.google_email || null,
    calendarId: data?.calendar_id || "primary",
    connectedAt: data?.connected_at || null,
    updatedAt: data?.updated_at || null,
  });
}

export async function DELETE() {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from("saloes_google_calendar_connections")
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id_salao", usuario.id_salao);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao desconectar Google Calendar." },
      { status: 500 }
    );
  }

  const userClient = await createClient();
  const { data: identitiesData, error: identitiesError } =
    await userClient.auth.getUserIdentities();

  if (identitiesError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "A integração foi desativada, mas não foi possível ler as identidades da conta para remover o Google do Supabase Auth.",
      },
      { status: 500 }
    );
  }

  const googleIdentity = identitiesData.identities.find(
    (identity) => String(identity.provider || "").toLowerCase() === "google"
  );

  let identityUnlinked = false;

  if (googleIdentity) {
    const { error: unlinkError } = await userClient.auth.unlinkIdentity(
      googleIdentity
    );

    if (unlinkError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A integração foi desativada, mas o Supabase não permitiu remover a identidade Google. Verifique se a conta tem e-mail/senha ativo e se Manual Linking está habilitado em Auth.",
        },
        { status: 409 }
      );
    } else {
      identityUnlinked = true;
    }
  }

  return NextResponse.json({ ok: true, identityUnlinked });
}
