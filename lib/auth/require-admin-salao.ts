import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export class AuthzError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export async function requireAdminSalao(idSalao: string) {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthzError("Usuário não autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id, id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new AuthzError("Erro ao validar usuário.", 500);
  }

  if (!usuario?.id_salao || usuario.id_salao !== idSalao) {
    throw new AuthzError("Acesso negado para este salão.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new AuthzError("Usuário inativo.", 403);
  }

  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    throw new AuthzError("Somente administrador pode executar esta ação.", 403);
  }

  return { user, usuario };
}
