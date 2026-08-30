import { unstable_cache } from "next/cache";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export type PainelUserContext = {
  id: string;
  id_salao: string;
  nome: string | null;
  email: string | null;
  nivel: string | null;
  status: string | null;
};

type GetPainelUserContextOptions = {
  allowAdminAal1?: boolean;
};

const getCachedPainelUserContextByAuthUserId = unstable_cache(
  async (authUserId: string): Promise<PainelUserContext | null> => {
    const database = getDatabaseAdmin();
    const { data, error } = await database
      .from("usuarios")
      .select("id, id_salao, nome, email, nivel, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error || !data?.id_salao) return null;

    return {
      id: String(data.id),
      id_salao: String(data.id_salao),
      nome: data.nome ? String(data.nome) : null,
      email: data.email ? String(data.email) : null,
      nivel: data.nivel ? String(data.nivel) : null,
      status: data.status ? String(data.status) : null,
    };
  },
  ["painel-user-context"],
  { revalidate: 60 }
);

export async function getPainelUserContextByAuthUserId(authUserId: string) {
  return getCachedPainelUserContextByAuthUserId(authUserId);
}

export async function getPainelUserContext(
  options: GetPainelUserContextOptions = {}
) {
  const session = await readPainelClerkSession();
  if (!session) return { user: null, usuario: null, mfaRequired: false };

  const usuario: PainelUserContext = {
    id: session.userId,
    id_salao: session.idSalao,
    nome: session.nome,
    email: session.email,
    nivel: session.nivel,
    status: session.status,
  };

  const isAdmin = String(usuario.nivel || "").toLowerCase() === "admin";
  if (isAdmin && !options.allowAdminAal1 && !session.mfaVerified) {
    return { user: null, usuario: null, mfaRequired: true };
  }

  return {
    user: {
      // `user.id` preserva o contrato historico (UUID de auth). O subject
      // Clerk `user_...` fica somente em session.clerkSubject.
      id: session.authUserId,
      email: session.email,
      user_metadata: { nome: session.nome },
    },
    usuario,
    mfaRequired: false,
  };
}
