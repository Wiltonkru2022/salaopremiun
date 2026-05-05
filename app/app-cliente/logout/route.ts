import { NextResponse } from "next/server";
import { clearClienteSession } from "@/lib/cliente-auth.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destino = String(url.searchParams.get("destino") || "/app-cliente/login");

  await clearClienteSession();
  return NextResponse.redirect(new URL(destino, url.origin));
}
