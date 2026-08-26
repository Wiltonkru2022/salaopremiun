import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export async function getUser() {
  const session = await readPainelClerkSession();
  if (!session) return null;

  return {
    id: session.clerkSubject,
    email: session.email,
    user_metadata: { nome: session.nome },
  };
}
