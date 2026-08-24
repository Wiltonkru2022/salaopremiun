import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasAal2 } from "@/lib/auth/mfa-assurance";

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

export async function getPainelUserContext(
  options: GetPainelUserContextOptions = {}
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, usuario: null, mfaRequired: false };
  }

  const usuario = await getPainelUserContextByAuthUserId(user.id);
  const isAdmin = String(usuario?.nivel || "").toLowerCase() === "admin";

  if (isAdmin && !options.allowAdminAal1) {
    const mfaSatisfied = await hasAal2();

    if (!mfaSatisfied) {
      return { user: null, usuario: null, mfaRequired: true };
    }
  }

  return { user, usuario, mfaRequired: false };
}
