import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { getAppRootDomain } from "@/lib/security/app-hosts";

export type ClienteAppSession = {
  idConta: string;
  nome: string;
  email: string;
  telefone?: string | null;
  tipo: "cliente";
};

const COOKIE_NAME = "sp_cliente_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const ENC_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type SessionEnvelope = {
  session: ClienteAppSession;
  exp: number;
};

function getSessionSecret() {
  const secret =
    process.env.CLIENTE_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "CLIENTE_SESSION_SECRET nao configurada (ou fallback PROFISSIONAL_SESSION_SECRET ausente)."
    );
  }

  return secret;
}

function getCookieDomain() {
  if (process.env.NODE_ENV !== "production") {
    return undefined;
  }

  return `.${getAppRootDomain()}`;
}

function deriveKey() {
  return crypto.createHash("sha256").update(getSessionSecret()).digest();
}

function base64UrlEncodeBuffer(value: Buffer) {
  return value.toString("base64url");
}

function base64UrlDecodeBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

function encryptEnvelope(envelope: SessionEnvelope) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey();
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(envelope), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    base64UrlEncodeBuffer(iv),
    base64UrlEncodeBuffer(tag),
    base64UrlEncodeBuffer(encrypted),
  ].join(".");
}

function decryptEnvelope(token: string): SessionEnvelope | null {
  const [ivEncoded, tagEncoded, encryptedEncoded] = token.split(".");
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    return null;
  }

  try {
    const iv = base64UrlDecodeBuffer(ivEncoded);
    const tag = base64UrlDecodeBuffer(tagEncoded);
    const encrypted = base64UrlDecodeBuffer(encryptedEncoded);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const parsed = JSON.parse(decrypted.toString("utf8")) as SessionEnvelope;

    if (!parsed?.session || !parsed?.exp) {
      return null;
    }

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function serializeSession(session: ClienteAppSession) {
  const envelope: SessionEnvelope = {
    session,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  return encryptEnvelope(envelope);
}

function parseSession(token: string): ClienteAppSession | null {
  const envelope = decryptEnvelope(token);
  if (!envelope?.session) {
    return null;
  }
  return envelope.session;
}

export async function hashClientePassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyClientePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createClienteSession(session: ClienteAppSession) {
  const cookieStore = await cookies();
  const token = serializeSession(session);
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  } as const;

  cookieStore.set(COOKIE_NAME, token, baseOptions);

  const cookieDomain = getCookieDomain();
  if (cookieDomain) {
    cookieStore.set(COOKIE_NAME, token, {
      ...baseOptions,
      domain: cookieDomain,
    });
  }
}

export async function getClienteSessionFromCookie(): Promise<ClienteAppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  return parseSession(raw);
}

export async function requireClienteSession() {
  const session = await getClienteSessionFromCookie();
  if (!session) {
    redirect("/app-cliente/login");
  }

  return session;
}

export async function clearClienteSession() {
  const cookieStore = await cookies();
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  } as const;

  cookieStore.set(COOKIE_NAME, "", baseOptions);

  const cookieDomain = getCookieDomain();
  if (cookieDomain) {
    cookieStore.set(COOKIE_NAME, "", {
      ...baseOptions,
      domain: cookieDomain,
    });
  }
}
