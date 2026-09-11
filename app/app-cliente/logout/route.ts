import { NextResponse } from "next/server";
import { clearClienteSession } from "@/lib/cliente-auth.server";

function buildLogoutDestination(value: string | null) {
  const destino = value || "/app-cliente/login";
  if (!destino.startsWith("/")) {
    return "/app-cliente/login?logout=1";
  }

  const url = new URL(destino, "https://salaopremiun.local");
  if (url.pathname === "/app-cliente/login") {
    url.searchParams.set("logout", "1");
  }

  return `${url.pathname}${url.search}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destino = buildLogoutDestination(url.searchParams.get("destino"));

  await clearClienteSession();
  return NextResponse.redirect(new URL(destino, url.origin));
}
