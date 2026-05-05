import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PainelUserContext = {
  id: string;
  id_salao: string;
  nome: string | null;
  email: string | null;
  nivel: string | null;
  status: string | null;
};

const getCachedPainelUserContextByAuthUserId = unstable_cache(
  async (authUserId: string): Promise<PainelUserContext | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("id, id_salao, nome, email, nivel, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error || !data?.id_salao) {
      return null;
    }

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
  {
    revalidate: 60,
  }
);

export async function getPainelUserContextByAuthUserId(authUserId: string) {
  return getCachedPainelUserContextByAuthUserId(authUserId);
}

export async function getPainelUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, usuario: null };
  }

  const usuario = await getPainelUserContextByAuthUserId(user.id);
  return { user, usuario };
}
