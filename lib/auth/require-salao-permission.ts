import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import {
  AuthzError,
  requireSalaoMembership,
} from "@/lib/auth/require-salao-membership";
import type { PermissionKey } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RequireSalaoPermissionOptions = {
  allowedNiveis?: string[];
};

export { AuthzError };

export async function requireSalaoPermission(
  idSalao: string,
  permission: PermissionKey,
  options: RequireSalaoPermissionOptions = {}
) {
  const membership = await requireSalaoMembership(idSalao, options);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: permissoesDb, error: permissoesError } = await supabaseAdmin
    .from("usuarios_permissoes")
    .select("*")
    .eq("id_usuario", membership.usuario.id)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (permissoesError) {
    throw new AuthzError("Erro ao carregar permissoes do usuario.", 500);
  }

  const permissoes = {
    ...buildPermissoesByNivel(membership.usuario.nivel),
    ...sanitizePermissoesDb(permissoesDb as Record<string, unknown> | null),
  };

  if (!permissoes[permission]) {
    throw new AuthzError("Usuario sem permissao para esta acao.", 403);
  }

  return {
    ...membership,
    permissoes,
  };
}

export async function requireSalaoAnyPermission(
  idSalao: string,
  permissions: PermissionKey[],
  options: RequireSalaoPermissionOptions = {}
) {
  if (permissions.length === 0) {
    throw new AuthzError("Nenhuma permissao informada para validacao.", 500);
  }

  const membership = await requireSalaoMembership(idSalao, options);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: permissoesDb, error: permissoesError } = await supabaseAdmin
    .from("usuarios_permissoes")
    .select("*")
    .eq("id_usuario", membership.usuario.id)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (permissoesError) {
    throw new AuthzError("Erro ao carregar permissoes do usuario.", 500);
  }

  const permissoes = {
    ...buildPermissoesByNivel(membership.usuario.nivel),
    ...sanitizePermissoesDb(permissoesDb as Record<string, unknown> | null),
  };

  const permitido = permissions.some((permission) => permissoes[permission]);

  if (!permitido) {
    throw new AuthzError("Usuario sem permissao para esta acao.", 403);
  }

  return {
    ...membership,
    permissoes,
  };
}
