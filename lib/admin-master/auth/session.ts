import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthCookieOptions } from "@/lib/auth/cookie-options";

export const ADMIN_MASTER_SESSION_COOKIE = "admin-master-session";
const ADMIN_MASTER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const ADMIN_MASTER_SESSION_VERSION = 2;

type AdminMasterSessionPayload = {
  v: number;
  authUserId: string;
  email: string;
  exp: number;
  iat: number;
  mfaVerifiedAt: number;
};

export type AdminMasterSession = {
  authUserId: string;
  email: string;
  expiresAt: number;
  issuedAt: number;
  mfaVerifiedAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(`${base64}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeBase64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function encodeTextToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function getAdminMasterSessionSecret() {
  const secret =
    process.env.ADMIN_MASTER_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "ADMIN_MASTER_SESSION_SECRET ou PROFISSIONAL_SESSION_SECRET nao configurada."
    );
  }

  return secret;
}

let cachedSigningKeyPromise: Promise<CryptoKey> | null = null;

function getSigningKey() {
  if (!cachedSigningKeyPromise) {
    cachedSigningKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getAdminMasterSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return cachedSigningKeyPromise;
}

async function signSessionPayload(payloadBase64: string) {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    new TextEncoder().encode(payloadBase64)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createAdminMasterSessionToken(params: {
  authUserId: string;
  email: string;
  mfaVerifiedAt?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminMasterSessionPayload = {
    v: ADMIN_MASTER_SESSION_VERSION,
    authUserId: params.authUserId,
    email: params.email.trim().toLowerCase(),
    iat: now,
    exp: now + ADMIN_MASTER_SESSION_MAX_AGE_SECONDS,
    // 0 significa sessão válida sem MFA. Não usamos `|| now`, porque isso
    // transformaria 0 em uma falsa confirmação de segundo fator.
    mfaVerifiedAt:
      typeof params.mfaVerifiedAt === "number" ? params.mfaVerifiedAt : 0,
  };

  const base = encodeTextToBase64Url(JSON.stringify(payload));
  return `${base}.${await signSessionPayload(base)}`;
}

export async function verifyAdminMasterSessionToken(token?: string | null) {
  const [base, signature] = String(token || "").split(".");
  if (!base || !signature) return null;
  if (signature !== (await signSessionPayload(base))) return null;

  let p: AdminMasterSessionPayload;
  try {
    p = JSON.parse(decodeBase64UrlToText(base));
  } catch {
    return null;
  }

  if (
    p.v !== ADMIN_MASTER_SESSION_VERSION ||
    !p.authUserId ||
    !p.email ||
    typeof p.exp !== "number" ||
    typeof p.iat !== "number" ||
    typeof p.mfaVerifiedAt !== "number" ||
    p.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return {
    authUserId: p.authUserId,
    email: p.email,
    expiresAt: p.exp,
    issuedAt: p.iat,
    mfaVerifiedAt: p.mfaVerifiedAt,
  } satisfies AdminMasterSession;
}

export async function readAdminMasterSession() {
  const store = await cookies();
  return verifyAdminMasterSessionToken(store.get(ADMIN_MASTER_SESSION_COOKIE)?.value);
}

export async function readAdminMasterSessionFromRequest(request: NextRequest) {
  return verifyAdminMasterSessionToken(
    request.cookies.get(ADMIN_MASTER_SESSION_COOKIE)?.value
  );
}

export function hasAdminMasterSessionCookie(request: NextRequest) {
  return request.cookies.has(ADMIN_MASTER_SESSION_COOKIE);
}

export async function setAdminMasterSessionCookie(
  response: NextResponse,
  params: {
    authUserId: string;
    email: string;
    host?: string | null;
    mfaVerifiedAt?: number;
  }
) {
  const token = await createAdminMasterSessionToken(params);
  response.cookies.set(ADMIN_MASTER_SESSION_COOKIE, token, {
    ...getAuthCookieOptions(params.host),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: ADMIN_MASTER_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminMasterSessionCookie(
  response: NextResponse,
  host?: string | null
) {
  response.cookies.set(ADMIN_MASTER_SESSION_COOKIE, "", {
    ...getAuthCookieOptions(host),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
}
