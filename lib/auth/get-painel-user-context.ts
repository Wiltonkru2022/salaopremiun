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

function mapContext(data: any): PainelUserContext | null {
  if (!data?.id_salao) return null;
  return {
    id: String(data.id),
    id_salao: String(data.id_salao),
    nome: data.nome ? String(data.nome) : null,
    email: data.email ? String(data.email) : null,
    nivel: data.nivel ? String(data.nivel) : null,
    status: data.status ? String(data.status) : null,
  };
}

const getCachedPainelUserContextByIdentity = unstable_cache(
  async (identityId: string): Promise<PainelUserContext | null> => {
    const database = getDatabaseAdmin();
    const identity = String(identityId || "").trim();
    if (!identity) return null;

    if (identity.startsWith("user_")) {
      const { data, error } = await database
        .from("usuarios")
        .select("id, id_salao, nome, email, nivel, status")
        .eq("clerk_user_id", identity)
        .maybeSingle();
      if (error) return null;
      return mapContext(data);
    }

    const { data, error } = await database
      .from("usuarios")
      .select("id, id_salao, nome, email, nivel, status")
      .eq("auth_user_id", identity)
      .maybeSingle();
    if (error) return null;
    return mapContext(data);
  },
  ["painel-user-context-identity-v2"],
  { revalidate: 60 }
);

export async function getPainelUserContextByAuthUserId(authUserId: string) {
  return getCachedPainelUserContextByIdentity(authUserId);
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
      id: session.clerkSubject,
      email: session.email,
      user_metadata: { nome: session.nome },
    },
    usuario,
    mfaRequired: false,
  };
}
