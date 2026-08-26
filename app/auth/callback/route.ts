import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard?boot=1";
  return value;
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const login = new URL("/login", request.nextUrl.origin);
  login.searchParams.set("next", next);
  login.searchParams.set("motivo", "auth_clerk");
  return NextResponse.redirect(login);
}
