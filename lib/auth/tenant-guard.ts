import "server-only";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getUser } from "@/lib/auth/get-user";

export type TenantActor = {
  authUserId: string;
  idUsuario: string;
  idSalao: string;
  nivel: string;
  status: string;
};

export async function requireTenantActor(): Promise<TenantActor> {
  const user = await getUser();
  const { usuario } = await getPainelUserContext();

  if (!user?.id) {
    throw new Error("Sessao invalida.");
  }

  if (!usuario?.id || !usuario.id_salao) {
    throw new Error("Usuario do sistema nao encontrado.");
  }

  if (usuario.status !== "ativo") {
    throw new Error("Usuario inativo.");
  }

  return {
    authUserId: user.id,
    idUsuario: usuario.id,
    idSalao: usuario.id_salao,
    nivel: String(usuario.nivel || ""),
    status: String(usuario.status || ""),
  };
}

export async function requireAdminTenantActor(): Promise<TenantActor> {
  const actor = await requireTenantActor();

  if (actor.nivel !== "admin") {
    throw new Error("Apenas administradores podem executar esta operacao.");
  }

  return actor;
}
