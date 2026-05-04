import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export const ADMIN_MASTER_SESSION_COOKIE = "admin-master-session";

const ADMIN_MASTER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const ADMIN_MASTER_SESSION_VERSION = 1;

type AdminMasterSessionPayload = {
  v: number;
  authUserId: string;
  email: string;
  exp: number;
  iat: number;
};

export type AdminMasterSession = {
  authUserId: string;
  email: string;
  expiresAt: number;
  issuedAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(`${base64}${padding}`);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

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
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: AdminMasterSessionPayload = {
    v: ADMIN_MASTER_SESSION_VERSION,
    authUserId: params.authUserId,
    email: params.email.trim().toLowerCase(),
    iat: nowSeconds,
    exp: nowSeconds + ADMIN_MASTER_SESSION_MAX_AGE_SECONDS,
  };

  const payloadBase64 = encodeTextToBase64Url(JSON.stringify(payload));
  const signature = await signSessionPayload(payloadBase64);

  return `${payloadBase64}.${signature}`;
}

export async function verifyAdminMasterSessionToken(token?: string | null) {
  const [payloadBase64, signature] = String(token || "").split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = await signSessionPayload(payloadBase64);

  if (signature !== expectedSignature) {
    return null;
  }

  let payload: AdminMasterSessionPayload;

  try {
    payload = JSON.parse(
      decodeBase64UrlToText(payloadBase64)
    ) as AdminMasterSessionPayload;
  } catch {
    return null;
  }

  if (
    payload.v !== ADMIN_MASTER_SESSION_VERSION ||
    !payload.authUserId ||
    !payload.email ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number"
  ) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp <= nowSeconds) {
    return null;
  }

  return {
    authUserId: payload.authUserId,
    email: payload.email,
    expiresAt: payload.exp,
    issuedAt: payload.iat,
  } satisfies AdminMasterSession;
}

export async function readAdminMasterSession() {
  const cookieStore = await cookies();
  return verifyAdminMasterSessionToken(
    cookieStore.get(ADMIN_MASTER_SESSION_COOKIE)?.value
  );
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
  }
) {
  const token = await createAdminMasterSessionToken(params);
  const cookieOptions = getSupabaseCookieOptions(params.host);

  response.cookies.set(ADMIN_MASTER_SESSION_COOKIE, token, {
    ...cookieOptions,
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
  const cookieOptions = getSupabaseCookieOptions(host);

  response.cookies.set(ADMIN_MASTER_SESSION_COOKIE, "", {
    ...cookieOptions,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
}
