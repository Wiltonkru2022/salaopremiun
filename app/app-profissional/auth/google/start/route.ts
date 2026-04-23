import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOMINIO_APP } from "@/lib/proxy/domain-config";

// rota publica: inicia o OAuth do Google para login/conexao do profissional.

function getIntent(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("intent");
  return value === "connect" ? "connect" : "login";
}

function redirectToLogin(error: string) {
  const url = new URL("/login", `https://${DOMINIO_APP}`);
  url.searchParams.set("erro", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const intent = getIntent(request);
  const supabase = await createClient();
  const callbackUrl = new URL(
    `/auth/google/callback?intent=${intent}`,
    `https://${DOMINIO_APP}`
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
    return redirectToLogin("google_indisponivel");
  }

  return NextResponse.redirect(data.url);
}
