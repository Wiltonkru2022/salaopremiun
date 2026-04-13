import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

export async function requireProfissionalSession() {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}