import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export type ProfissionalSession = {
  idProfissional: string;
  idSalao: string;
  nome: string;
  cpf: string;
  tipo: "profissional";
};

const COOKIE_NAME = "sp_profissional_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSessionSecret() {
  const secret = process.env.PROFISSIONAL_SESSION_SECRET;
  if (!secret) {
    throw new Error("PROFISSIONAL_SESSION_SECRET não configurado.");
  }
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

type SessionEnvelope = {
  session: ProfissionalSession;
  exp: number;
};

function serializeSession(session: ProfissionalSession) {
  const envelope: SessionEnvelope = {
    session,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payload = base64UrlEncode(JSON.stringify(envelope));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function parseSession(token: string): ProfissionalSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as SessionEnvelope;
    if (!decoded?.session || !decoded?.exp) return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded.session;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createProfissionalSession(session: ProfissionalSession) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, serializeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getProfissionalSessionFromCookie(): Promise<ProfissionalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  return parseSession(raw);
}

export async function clearProfissionalSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}