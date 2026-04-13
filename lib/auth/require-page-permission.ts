// lib/auth/require-page-permission.ts
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { getUserRole } from "@/lib/auth/get-user-role";
import type { PermissionKey } from "@/lib/permissions";

export async function requirePagePermission(permission: PermissionKey) {
  const usuario = await getUserRole();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.status !== "ativo") {
    redirect("/login");
  }

  if (!hasPermission(usuario.nivel, permission)) {
    redirect("/dashboard");
  }

  return usuario;
}