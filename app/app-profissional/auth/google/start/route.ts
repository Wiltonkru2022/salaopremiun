import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// rota publica: inicia o OAuth do Google para login/conexao do profissional.

function getIntent(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("intent");
  return value === "connect" ? "connect" : "login";
}

function redirectToLogin(request: NextRequest, error: string) {
  const url = new URL("/app-profissional/login", request.url);
  url.searchParams.set("erro", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const intent = getIntent(request);
  const supabase = await createClient();
  const callbackUrl = new URL(
    `/app-profissional/auth/google/callback?intent=${intent}`,
    request.url
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return redirectToLogin(request, "google_indisponivel");
  }

  return NextResponse.redirect(data.url);
}
