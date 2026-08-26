import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedUrl = "";

function getClerkConfig() {
  const issuer = process.env.CLERK_ISSUER_URL?.trim();
  const jwksUrl = process.env.CLERK_JWKS_URL?.trim();
  const audience = process.env.CLERK_AUDIENCE?.trim() || undefined;
  if (!issuer || !jwksUrl) throw new Error("Clerk não configurado.");
  if (!cachedJwks || cachedUrl !== jwksUrl) {
    cachedUrl = jwksUrl;
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return { issuer, jwks: cachedJwks, audience };
}

export type ClerkAdminIdentity = {
  subject: string;
  email: string | null;
  payload: JWTPayload;
};

export async function verifyClerkBearerToken(token: string): Promise<ClerkAdminIdentity> {
  const { issuer, jwks, audience } = getClerkConfig();
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    ...(audience ? { audience } : {}),
  });
  const email = typeof payload.email === "string"
    ? payload.email
    : typeof payload.primary_email_address === "string"
      ? payload.primary_email_address
      : null;
  return { subject: String(payload.sub || ""), email, payload };
}

export function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
