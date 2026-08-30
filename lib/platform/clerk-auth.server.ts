import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  withNeonRls,
  type NeonResolvedIdentity,
} from "@/lib/neon/database.server";
import type { PoolClient } from "@neondatabase/serverless";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedUrl = "";

function decodeClerkFrontendApiFromPublishableKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!key) return null;

  const encoded = key.split("_")[2] || "";
  if (!encoded) return null;

  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8").replace(/\$$/, "").trim() || null;
  } catch {
    return null;
  }
}

function getClerkConfig() {
  const frontendApi = decodeClerkFrontendApiFromPublishableKey();
  const derivedIssuer = frontendApi ? `https://${frontendApi}` : null;

  // A publishable key usada pelo navegador e o issuer/JWKS usados pelo servidor
  // precisam pertencer à mesma instância Clerk. Em desenvolvimento era possível
  // manter CLERK_ISSUER_URL/JWKS antigos no .env e o login do browser funcionava,
  // mas o backend rejeitava o token com 401. Quando temos a publishable key,
  // derivamos issuer e JWKS dela para manter os dois lados sincronizados.
  const issuer = derivedIssuer || process.env.CLERK_ISSUER_URL?.trim() || null;
  const jwksUrl = derivedIssuer
    ? `${derivedIssuer}/.well-known/jwks.json`
    : process.env.CLERK_JWKS_URL?.trim() || null;
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();

  if (!issuer || !jwksUrl || !secretKey) {
    throw new Error("Clerk não configurado.");
  }

  if (!cachedJwks || cachedUrl !== jwksUrl) {
    cachedUrl = jwksUrl;
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  return { issuer, jwks: cachedJwks, secretKey };
}

export type ClerkAdminIdentity = {
  subject: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  secondFactorAgeMinutes: number | null;
  payload: JWTPayload;
};

type ClerkUserResponse = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{
    id?: string;
    email_address?: string;
    verification?: { status?: string } | null;
  }>;
};

function parseFactorVerificationAge(payload: JWTPayload) {
  const raw = payload.fva;
  if (!Array.isArray(raw) || raw.length < 2) {
    return { mfaEnrolled: false, mfaVerified: false, secondFactorAgeMinutes: null };
  }

  const second = Number(raw[1]);
  const mfaEnrolled = Number.isFinite(second) && second >= 0;
  return {
    mfaEnrolled,
    mfaVerified: mfaEnrolled,
    secondFactorAgeMinutes: mfaEnrolled ? second : null,
  };
}

async function fetchClerkUser(userId: string) {
  const { secretKey } = getClerkConfig();
  const response = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Falha ao consultar usuário Clerk (${response.status}).`);
  }

  return (await response.json()) as ClerkUserResponse;
}

function resolvePrimaryEmail(user: ClerkUserResponse) {
  const emails = Array.isArray(user.email_addresses) ? user.email_addresses : [];
  const primary = emails.find((item) => item.id === user.primary_email_address_id) || emails[0];
  const email = String(primary?.email_address || "").trim().toLowerCase();
  return email || null;
}

export async function verifyClerkBearerToken(token: string): Promise<ClerkAdminIdentity> {
  const { issuer, jwks } = getClerkConfig();

  // Session tokens do Clerk usam claims como azp/fva e nem toda configuração
  // produz um `aud` tradicional. Exigir CLERK_AUDIENCE aqui fazia tokens válidos
  // do localhost falharem. A assinatura e o issuer da instância continuam sendo
  // verificados criptograficamente.
  const { payload } = await jwtVerify(token, jwks, { issuer });

  const subject = String(payload.sub || "").trim();
  if (!subject) throw new Error("Token Clerk sem usuário.");

  const factorState = parseFactorVerificationAge(payload);
  const directEmail =
    typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : typeof payload.primary_email_address === "string"
        ? payload.primary_email_address.trim().toLowerCase()
        : "";

  let email = directEmail || null;
  let firstName: string | null = null;
  let lastName: string | null = null;

  if (!email) {
    const user = await fetchClerkUser(subject);
    email = resolvePrimaryEmail(user);
    firstName = user.first_name ? String(user.first_name) : null;
    lastName = user.last_name ? String(user.last_name) : null;
  }

  return {
    subject,
    email,
    firstName,
    lastName,
    ...factorState,
    payload,
  };
}

export function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function withClerkNeonRls<T>(
  request: Request,
  operation: (
    client: PoolClient,
    context: NeonResolvedIdentity,
    clerk: ClerkAdminIdentity
  ) => Promise<T>
): Promise<T> {
  const token = readBearerToken(request);
  if (!token) throw new Error("Token Clerk ausente.");

  const clerk = await verifyClerkBearerToken(token);
  if (!clerk.email) throw new Error("Usuário Clerk sem e-mail válido.");

  return withNeonRls(
    {
      email: clerk.email,
      mfaVerified: clerk.mfaVerified || !clerk.mfaEnrolled,
    },
    (client, context) => operation(client, context, clerk)
  );
}
