import { NextRequest, NextResponse } from "next/server";
import {
  createClienteSessionCookieToken,
  parseClienteSessionEstablishToken,
} from "@/lib/cliente-auth.server";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "sp_cliente_session";
const LOGOUT_COOKIE = "sp_cliente_logout";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 180;

export async function POST(request: NextRequest) {
  let token = "";

  try {
    const body = (await request.json()) as {
      token?: unknown;
    };

    token = String(body?.token || "").trim();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 }
    );
  }

  const session =
    parseClienteSessionEstablishToken(token);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "invalid_session" },
      { status: 401 }
    );
  }

  const isLocal =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1";

  const secure =
    !isLocal && request.nextUrl.protocol === "https:";

  const response = NextResponse.json({
    ok: true,
  });

  /*
   * Gera um token NOVO e de longa duração para o cookie.
   * O token curto recebido do browser nunca vira a sessão persistente.
   */
  const sessionCookieToken =
    createClienteSessionCookieToken(session);

  response.cookies.set(
    SESSION_COOKIE,
    sessionCookieToken,
    {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    }
  );

  /*
   * Limpa o logout residual no mesmo response que estabelece a sessão.
   */
  response.cookies.set(
    LOGOUT_COOKIE,
    "",
    {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    }
  );

  return response;
}
