import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const PAINEL_CLERK_COOKIE = "sp-painel-auth-token";

type PainelClerkSession = {
  clerkSubject: string;
  userId: string;
  authUserId: string;
  idSalao: string;
  nome: string | null;
  email: string | null;
  nivel: string | null;
  status: string | null;
  mfaVerified: boolean;
};

function sessionSecret() {
  const raw = String(process.env.CLERK_SECRET_KEY || "").trim();
  if (!raw) throw new Error("CLERK_SECRET_KEY nao configurada.");
  return createHash("sha256").update(`painel-session:${raw}`).digest();
}

function cookieDomain() {
  if (process.env.NODE_ENV !== "production") return undefined;
  const root = String(process.env.APP_ROOT_DOMAIN || "salaopremiun.com.br")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^\./, "")
    .replace(/\/.*$/, "");
  return root ? `.${root}` : undefined;
}

export async function createPainelClerkSession(payload: PainelClerkSession) {
  const token = await new SignJWT({
    clerkSubject: payload.clerkSubject,
    userId: payload.userId,
    authUserId: payload.authUserId,
    idSalao: payload.idSalao,
    nome: payload.nome,
    email: payload.email,
    nivel: payload.nivel,
    status: payload.status,
    mfaVerified: payload.mfaVerified,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("salaopremium-painel")
    .setAudience("salaopremium-painel")
    .sign(sessionSecret());

  const store = await cookies();
  store.set(PAINEL_CLERK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    maxAge: 60 * 60 * 8,
  });
}

export async function readPainelClerkSession(): Promise<PainelClerkSession | null> {
  const store = await cookies();
  const token = store.get(PAINEL_CLERK_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      issuer: "salaopremium-painel",
      audience: "salaopremium-painel",
    });
    const userId = String(payload.userId || "").trim();
    const authUserId = String(payload.authUserId || "").trim();
    const idSalao = String(payload.idSalao || "").trim();
    const clerkSubject = String(payload.clerkSubject || "").trim();
    // Cookies antigos, criados antes da separacao Clerk x UUID interno, sao
    // invalidados de forma segura para evitar enviar `user_...` a colunas UUID.
    if (!userId || !authUserId || !idSalao || !clerkSubject) return null;
    return {
      clerkSubject,
      userId,
      authUserId,
      idSalao,
      nome: typeof payload.nome === "string" ? payload.nome : null,
      email: typeof payload.email === "string" ? payload.email : null,
      nivel: typeof payload.nivel === "string" ? payload.nivel : null,
      status: typeof payload.status === "string" ? payload.status : null,
      mfaVerified: payload.mfaVerified === true,
    };
  } catch {
    return null;
  }
}

export async function clearPainelClerkSession() {
  const store = await cookies();
  store.set(PAINEL_CLERK_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    maxAge: 0,
  });
}
