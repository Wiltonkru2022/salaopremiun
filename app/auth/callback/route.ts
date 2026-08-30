import { NextRequest, NextResponse } from "next/server";
import { getLoginUrl } from "@/lib/site-urls";

export const dynamic = "force-dynamic";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard?boot=1";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const login = new URL(getLoginUrl("/login"));
  login.searchParams.set("returnTo", next);
  login.searchParams.set("motivo", "oauth_legado_removido");
  return NextResponse.redirect(login, 307);
}
