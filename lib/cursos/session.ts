import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "sp-cursos-session";
const MAX_AGE = 60 * 60 * 24 * 14;

export type CursoSession = {
  userId: string;
  email: string;
  role: "aluno" | "professor" | "admin";
};

function secret() {
  const value =
    process.env.CURSOS_SESSION_SECRET ||
    process.env.ADMIN_MASTER_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Configure CURSOS_SESSION_SECRET com pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(value);
}

export async function createCursoSession(payload: CursoSession) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readCursoSession(): Promise<CursoSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.userId || !payload.email || !payload.role) return null;
    return payload as unknown as CursoSession;
  } catch {
    return null;
  }
}

export async function clearCursoSession() {
  (await cookies()).delete(COOKIE);
}

export function emailPodeAdministrar(email: string) {
  const permitidos = (process.env.CURSOS_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return permitidos.includes(email.trim().toLowerCase());
}
