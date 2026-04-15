import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RequireSalaoMembershipOptions = {
  allowedNiveis?: string[];
};

export class AuthzError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export async function requireSalaoMembership(
  idSalao: string,
  options: RequireSalaoMembershipOptions = {}
) {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthzError("Usuario nao autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id, id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new AuthzError("Erro ao validar usuario.", 500);
  }

  if (!usuario?.id_salao || usuario.id_salao !== idSalao) {
    throw new AuthzError("Acesso negado para este salao.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new AuthzError("Usuario inativo.", 403);
  }

  if (options.allowedNiveis?.length) {
    const nivelNormalizado = String(usuario.nivel || "").toLowerCase();
    const niveisPermitidos = options.allowedNiveis.map((item) =>
      item.toLowerCase()
    );

    if (!niveisPermitidos.includes(nivelNormalizado)) {
      throw new AuthzError("Usuario sem nivel permitido para esta acao.", 403);
    }
  }

  return { user, usuario };
}
