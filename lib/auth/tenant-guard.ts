import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";

export type TenantActor = {
  authUserId: string;
  idUsuario: string;
  idSalao: string;
  nivel: string;
  status: string;
};

export async function requireTenantActor(): Promise<TenantActor> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user?.id) {
    throw new Error("Sessao invalida.");
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, id_salao, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data?.id || !data.id_salao) {
    throw new Error("Usuario do sistema nao encontrado.");
  }

  if (data.status !== "ativo") {
    throw new Error("Usuario inativo.");
  }

  return {
    authUserId: user.id,
    idUsuario: data.id,
    idSalao: data.id_salao,
    nivel: String(data.nivel || ""),
    status: String(data.status || ""),
  };
}

export async function requireAdminTenantActor(): Promise<TenantActor> {
  const actor = await requireTenantActor();

  if (actor.nivel !== "admin") {
    throw new Error("Apenas administradores podem executar esta operacao.");
  }

  return actor;
}
