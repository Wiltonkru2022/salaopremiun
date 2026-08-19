import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
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

const COOKIE_NAME = "sp_cliente_session";
const LOGOUT_MARKER_COOKIE_NAME = "sp_cliente_logout";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 180;
const RESTORE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const ENC_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type SessionEnvelope = {
  session: ClienteAppSession;
  exp: number;
  purpose?: "session" | "restore";
};

function getSessionSecret() {
  const secret = process.env.CLIENTE_SESSION_SECRET || process.env.PROFISSIONAL_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "CLIENTE_SESSION_SECRET nao configurada (ou fallback PROFISSIONAL_SESSION_SECRET ausente)."
    );
  }
  return secret;
}

async function getCookieDomain() {
  if (process.env.NODE_ENV !== "production") return undefined;
  const requestHeaders = await headers();
  const host = String(requestHeaders.get("host") || "").split(":")[0].toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return undefined;
  return `.${getAppRootDomain()}`;
}

async function shouldUseSecureCookies() {
  if (process.env.NODE_ENV !== "production") return false;
  const requestHeaders = await headers();
  const host = String(requestHeaders.get("host") || "").split(":")[0].toLowerCase();
  const protocol = String(requestHeaders.get("x-forwarded-proto") || "").toLowerCase();
  return !(host === "localhost" || host === "127.0.0.1" || host === "::1" || protocol === "http");
}

function deriveKey() {
  return crypto.createHash("sha256").update(getSessionSecret()).digest();
}

function encryptEnvelope(envelope: SessionEnvelope) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(envelope), "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptEnvelope(token: string): SessionEnvelope | null {
  const [ivEncoded, tagEncoded, encryptedEncoded] = token.split(".");
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) return null;

  try {
    const decipher = crypto.createDecipheriv(
      ENC_ALGORITHM,
      deriveKey(),
      Buffer.from(ivEncoded, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedEncoded, "base64url")),
      decipher.final(),
    ]);
    const parsed = JSON.parse(decrypted.toString("utf8")) as SessionEnvelope;
    if (!parsed?.session?.idConta || !parsed?.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function serializeSession(
  session: ClienteAppSession,
  purpose: "session" | "restore",
  ttlSeconds: number
) {
  return encryptEnvelope({
    session: {
      ...session,
      authVersion: Number(session.authVersion || 1),
      issuedAt: session.issuedAt || Date.now(),
    },
    purpose,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
}

function parseSession(
  token: string,
  expectedPurpose: "session" | "restore"
): ClienteAppSession | null {
  const envelope = decryptEnvelope(token);
  if (!envelope?.session) return null;
  if (envelope.purpose && envelope.purpose !== expectedPurpose) return null;
  return envelope.session;
}

export function createClienteSessionRestoreToken(session: ClienteAppSession) {
  return serializeSession(session, "restore", RESTORE_TOKEN_TTL_SECONDS);
}

export function parseClienteSessionRestoreToken(token: string) {
  return parseSession(token, "restore");
}

// Mantidos somente para o login legado durante a janela de migração.
export async function hashClientePassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyClientePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createClienteSession(session: ClienteAppSession) {
  const cookieStore = await cookies();
  const token = serializeSession(session, "session", SESSION_TTL_SECONDS);
  const secure = await shouldUseSecureCookies();
  const baseOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  } as const;

  cookieStore.set(LOGOUT_MARKER_COOKIE_NAME, "", { ...baseOptions, maxAge: 0 });
  cookieStore.set(COOKIE_NAME, token, baseOptions);

  const cookieDomain = await getCookieDomain();
  if (cookieDomain) {
    cookieStore.set(LOGOUT_MARKER_COOKIE_NAME, "", { ...baseOptions, domain: cookieDomain, maxAge: 0 });
    cookieStore.set(COOKIE_NAME, token, { ...baseOptions, domain: cookieDomain });
  }
}

export async function getClienteSessionFromCookie(): Promise<ClienteAppSession | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(LOGOUT_MARKER_COOKIE_NAME)?.value) return null;

  for (const raw of cookieStore.getAll(COOKIE_NAME).map((cookie) => cookie.value).filter(Boolean)) {
    const session = parseSession(raw, "session");
    if (session?.idConta) return session;
  }
  return null;
}

export async function requireClienteSession() {
  const session = await getClienteSessionFromCookie();
  if (!session) redirect("/app-cliente/login");
  return session;
}

export async function clearClienteSession() {
  const cookieStore = await cookies();
  const secure = await shouldUseSecureCookies();
  const baseOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  } as const;

  cookieStore.set(LOGOUT_MARKER_COOKIE_NAME, String(Date.now()), {
    ...baseOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
  cookieStore.set(COOKIE_NAME, "", baseOptions);

  const cookieDomain = await getCookieDomain();
  if (cookieDomain) {
    cookieStore.set(LOGOUT_MARKER_COOKIE_NAME, String(Date.now()), {
      ...baseOptions,
      domain: cookieDomain,
      maxAge: SESSION_TTL_SECONDS,
    });
    cookieStore.set(COOKIE_NAME, "", { ...baseOptions, domain: cookieDomain });
  }
}

export async function hasClienteLogoutMarker() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(LOGOUT_MARKER_COOKIE_NAME)?.value);
}
