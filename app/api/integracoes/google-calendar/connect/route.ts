import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getGoogleCalendarEnv, isGoogleCalendarConfigured } from "@/lib/google-calendar/oauth";

export const dynamic = "force-dynamic";

function toBase64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export async function GET() {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.redirect("https://login.salaopremiun.com.br/login");
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      "https://painel.salaopremiun.com.br/perfil-salao?google_calendar=env"
    );
  }

  const env = getGoogleCalendarEnv();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ")
  );
  url.searchParams.set(
    "state",
    toBase64Url({
      idSalao: usuario.id_salao,
      returnTo: "/perfil-salao?google_calendar=connected",
    })
  );

  return NextResponse.redirect(url);
}

