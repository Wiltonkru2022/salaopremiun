import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard?boot=1";
  return value;
}

/**
 * Rota historica do OAuth antigo. O Painel agora autentica exclusivamente pelo Clerk.
 * Mantemos o endpoint para bookmarks/callbacks antigos nao terminarem em erro.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = sanitizeNextPath(
    requestUrl.searchParams.get("next") || requestUrl.searchParams.get("returnTo")
  );
  const login = new URL("https://login.salaopremiun.com.br/login-clerk");
  login.searchParams.set("returnTo", next);
  login.searchParams.set("motivo", "oauth_legado_migrado_clerk");
  return NextResponse.redirect(login);
}
