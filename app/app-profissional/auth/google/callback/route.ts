import { NextRequest, NextResponse } from "next/server";
import {
  createProfissionalSession,
  getProfissionalSessionFromCookie,
} from "@/lib/profissional-auth.server";
import { createClient } from "@/lib/supabase/server";
import {
  loginProfissionalByGoogleAuthUser,
  vincularGoogleAoProfissional,
} from "@/app/services/profissional/auth";

// rota publica: callback OAuth validado pelo code retornado pelo Supabase.

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, request.url);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const intent =
    request.nextUrl.searchParams.get("intent") === "connect"
      ? "connect"
      : "login";

  if (!code) {
    return redirectTo(request, "/app-profissional/login", {
      erro: "google_codigo_ausente",
    });
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    return redirectTo(request, "/app-profissional/login", {
      erro: "google_sessao_invalida",
    });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return redirectTo(request, "/app-profissional/login", {
      erro: "google_usuario_invalido",
    });
  }

  if (intent === "connect") {
    const session = await getProfissionalSessionFromCookie();

    if (!session) {
      await supabase.auth.signOut();
      return redirectTo(request, "/app-profissional/login", {
        erro: "sessao_expirada",
      });
    }

    const result = await vincularGoogleAoProfissional({
      idProfissional: session.idProfissional,
      idSalao: session.idSalao,
      googleAuthUserId: user.id,
      googleEmail: user.email ?? null,
    });

    if (!result.ok) {
      await supabase.auth.signOut();
      return redirectTo(request, "/app-profissional/perfil", {
        erro: result.error,
      });
    }

    await supabase.auth.signOut();
    return redirectTo(request, "/app-profissional/perfil", {
      google: "conectado",
    });
  }

  const result = await loginProfissionalByGoogleAuthUser(
    user.id,
    user.email ?? null
  );

  if (!result.ok) {
    await supabase.auth.signOut();
    return redirectTo(request, "/app-profissional/login", {
      erro: result.error,
    });
  }

  await createProfissionalSession(result.session);
  await supabase.auth.signOut();
  return redirectTo(request, "/app-profissional/inicio");
}
