import "server-only";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAppRootDomain } from "@/lib/security/app-hosts";

export type ClienteAppSession = {
  idConta: string;
  nome: string;
  email: string;
  whatsapp?: string | null;
  telefone?: string | null;
  authVersion: number;
  issuedAt?: number;
  tipo: "cliente";
};

type SessionEnvelope = {
  v: 1;
  session: ClienteAppSession;
  exp: number;
};

const SESSION_COOKIE = "sp_cliente_session";
const LOGOUT_COOKIE = "sp_cliente_logout";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 180;
const RESTORE_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const TOKEN_PREFIX = "spc1";

function getSessionSecret() {
  const secret =
    process.env.CLIENTE_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET;

  if (!secret || secret.trim().length < 16) {
    throw new Error(
      "CLIENTE_SESSION_SECRET não configurada ou muito curta."
    );
  }

  return secret;
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return (
      left.length === right.length &&
      crypto.timingSafeEqual(left, right)
    );
  } catch {
    return false;
  }
}

function encodeEnvelope(envelope: SessionEnvelope) {
  const payload = Buffer.from(
    JSON.stringify(envelope),
    "utf8"
  ).toString("base64url");

  const unsigned = `${TOKEN_PREFIX}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

function decodeEnvelope(token: string): SessionEnvelope | null {
  const [prefix, payload, signature] = String(token || "").split(".");

  if (
    prefix !== TOKEN_PREFIX ||
    !payload ||
    !signature
  ) {
    return null;
  }

  const unsigned = `${prefix}.${payload}`;
  const expected = sign(unsigned);

  if (!safeEqual(signature, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionEnvelope;

    if (
      parsed?.v !== 1 ||
      !parsed.session?.idConta ||
      parsed.session.tipo !== "cliente" ||
      !Number.isFinite(Number(parsed.session.authVersion)) ||
      Number(parsed.session.authVersion) < 1 ||
      !parsed.exp ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function createClienteSessionTokenWithTtl(
  session: ClienteAppSession,
  ttlSeconds: number
) {
  const authVersion = Number(session.authVersion);

  if (
    !session.idConta ||
    !Number.isFinite(authVersion) ||
    authVersion < 1
  ) {
    throw new Error("Sessão de cliente inválida.");
  }

  return encodeEnvelope({
    v: 1,
    session: {
      ...session,
      authVersion,
      issuedAt: session.issuedAt || Date.now(),
      tipo: "cliente",
    },
    exp:
      Math.floor(Date.now() / 1000) +
      ttlSeconds,
  });
}

export function createClienteSessionToken(
  session: ClienteAppSession
) {
  return createClienteSessionTokenWithTtl(
    session,
    SESSION_TTL_SECONDS
  );
}

export function parseClienteSessionToken(
  token: string
): ClienteAppSession | null {
  const envelope = decodeEnvelope(token);

  if (!envelope) return null;

  return {
    ...envelope.session,
    authVersion: Number(envelope.session.authVersion),
    tipo: "cliente",
  };
}


/*
 * Compatibilidade com recuperação/restauração de sessão já usada
 * em outras partes do App Cliente.
 */
export function createClienteSessionRestoreToken(
  session: ClienteAppSession
) {
  return createClienteSessionTokenWithTtl(
    {
      ...session,
      issuedAt: Date.now(),
    },
    RESTORE_TOKEN_TTL_SECONDS
  );
}

export function parseClienteSessionRestoreToken(
  token: string
) {
  return parseClienteSessionToken(token);
}

/*
 * Compatibilidade com o fluxo legado de senha.
 * O login novo CPF+nascimento não usa senha, mas auth.ts ainda
 * mantém rotas/funções de migração e recuperação antigas.
 */
export async function hashClientePassword(
  password: string
) {
  return bcrypt.hash(password, 10);
}

export async function verifyClientePassword(
  password: string,
  hash: string
) {
  return bcrypt.compare(password, hash);
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function responseCookieOptions(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const local = isLocalHost(hostname);

  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      !local &&
      request.nextUrl.protocol === "https:",
    path: "/",
  };

  if (
    process.env.NODE_ENV === "production" &&
    !local
  ) {
    return {
      ...base,
      domain: `.${getAppRootDomain()}`,
    };
  }

  return base;
}

export function setClienteSessionOnResponse(
  request: NextRequest,
  response: NextResponse,
  session: ClienteAppSession
) {
  const options = responseCookieOptions(request);

  /*
   * Primeiro elimina estados antigos no MESMO response.
   */
  response.cookies.set(SESSION_COOKIE, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(LOGOUT_COOKIE, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });

  /*
   * Depois cria uma única sessão nova.
   */
  response.cookies.set(
    SESSION_COOKIE,
    createClienteSessionToken(session),
    {
      ...options,
      maxAge: SESSION_TTL_SECONDS,
    }
  );

  return response;
}

export function clearClienteSessionOnResponse(
  request: NextRequest,
  response: NextResponse,
  explicitLogout = true
) {
  const options = responseCookieOptions(request);

  response.cookies.set(SESSION_COOKIE, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });

  if (explicitLogout) {
    response.cookies.set(
      LOGOUT_COOKIE,
      String(Date.now()),
      {
        ...options,
        maxAge: SESSION_TTL_SECONDS,
      }
    );
  } else {
    response.cookies.set(LOGOUT_COOKIE, "", {
      ...options,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}

export async function getClienteSessionFromCookie(): Promise<ClienteAppSession | null> {
  const store = await cookies();

  /*
   * Sessão válida tem prioridade sobre marcador residual.
   * Isso impede logout antigo de bloquear um login novo.
   */
  for (const item of store.getAll(SESSION_COOKIE)) {
    const session = parseClienteSessionToken(item.value);
    if (session) return session;
  }

  return null;
}

export async function hasClienteLogoutMarker() {
  const store = await cookies();

  for (const item of store.getAll(SESSION_COOKIE)) {
    if (parseClienteSessionToken(item.value)) {
      return false;
    }
  }

  return Boolean(store.get(LOGOUT_COOKIE)?.value);
}

export async function requireClienteSession() {
  const session = await getClienteSessionFromCookie();

  if (!session) {
    redirect("/app-cliente/login");
  }

  return session;
}

/*
 * Compatibilidade com partes antigas do projeto.
 * A autenticação nova deve preferir setClienteSessionOnResponse().
 */
export async function createClienteSession(
  session: ClienteAppSession
) {
  const store = await cookies();
  const token = createClienteSessionToken(session);

  store.set(LOGOUT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearClienteSessionOnly() {
  const store = await cookies();

  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function clearClienteSession() {
  const store = await cookies();

  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  store.set(LOGOUT_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
