import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getGoogleCalendarEnv, isGoogleCalendarConfigured } from "@/lib/google-calendar/oauth";
import { verifyGoogleCalendarState } from "@/lib/google-calendar/state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = isGoogleCalendarConfigured()
    ? verifyGoogleCalendarState(url.searchParams.get("state"))
    : null;
  const idSalao = String(state?.idSalao || "").trim();

  if (!code || !idSalao || !isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      "https://painel.salaopremiun.com.br/perfil-salao?google_calendar=erro"
    );
  }

  const env = getGoogleCalendarEnv();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenResponse.json().catch(() => null)) as
    | {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        id_token?: string;
        error_description?: string;
      }
    | null;

  if (!tokenResponse.ok || !tokenData?.access_token) {
    return NextResponse.redirect(
      "https://painel.salaopremiun.com.br/perfil-salao?google_calendar=erro"
    );
  }

  let googleEmail: string | null = null;
  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  }).catch(() => null);
  if (userInfoResponse?.ok) {
    const userInfo = (await userInfoResponse.json().catch(() => null)) as
      | { email?: string }
      | null;
    googleEmail = userInfo?.email || null;
  }

  const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 3300) * 1000);
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from("saloes_google_calendar_connections")
    .upsert(
      {
        id_salao: idSalao,
        google_email: googleEmail,
        calendar_id: "primary",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        ativo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id_salao" }
    );

  if (error) {
    return NextResponse.redirect(
      "https://painel.salaopremiun.com.br/perfil-salao?google_calendar=erro"
    );
  }

  return NextResponse.redirect(
    `https://painel.salaopremiun.com.br${state?.returnTo || "/perfil-salao?google_calendar=connected"}`
  );
}
