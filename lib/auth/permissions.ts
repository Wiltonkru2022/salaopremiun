// lib/auth/permissions.ts
import { PERMISSIONS, PermissionKey, UserNivel } from "@/lib/permissions";

export function hasPermission(
  nivel: UserNivel | null | undefined,
  permission: PermissionKey
) {
  if (!nivel) return false;
  return PERMISSIONS[permission].includes(nivel);
}