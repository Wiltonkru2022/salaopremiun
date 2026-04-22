// lib/auth/require-page-permission.ts
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { getUserRole } from "@/lib/auth/get-user-role";
import type { PermissionKey, UserNivel } from "@/lib/permissions";

function asUserNivel(value: string | null | undefined): UserNivel | null {
  if (
    value === "admin" ||
    value === "gerente" ||
    value === "profissional" ||
    value === "recepcao"
  ) {
    return value;
  }

  return null;
}

export async function requirePagePermission(permission: PermissionKey) {
  const usuario = await getUserRole();

  if (!usuario) {
    redirect("/login?motivo=sessao_expirada");
  }

  if (usuario.status !== "ativo") {
    redirect("/login?motivo=usuario_inativo");
  }

  if (!hasPermission(asUserNivel(usuario.nivel), permission)) {
    redirect("/dashboard?motivo=sem_permissao");
  }

  return usuario;
}
