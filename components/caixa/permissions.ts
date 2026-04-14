import {
  PERMISSIONS,
  type PermissionKey,
  type UserNivel,
} from "@/lib/permissions";

export type Permissoes = Record<string, boolean>;

function normalizeNivel(value: string | null | undefined): UserNivel | null {
  const nivel = String(value || "").trim().toLowerCase();

  if (
    nivel === "admin" ||
    nivel === "gerente" ||
    nivel === "profissional" ||
    nivel === "recepcao"
  ) {
    return nivel;
  }

  return null;
}

export function buildPermissoesByNivel(
  nivel: string | null | undefined
): Permissoes {
  const nivelNormalizado = normalizeNivel(nivel);
  const resultado: Permissoes = {};

  (Object.keys(PERMISSIONS) as PermissionKey[]).forEach((key) => {
    resultado[key] =
      !!nivelNormalizado && PERMISSIONS[key].includes(nivelNormalizado);
  });

  return resultado;
}

export function sanitizePermissoesDb(
  permissoesDb: Record<string, unknown> | null | undefined
): Permissoes {
  if (!permissoesDb) return {};

  const ignora = new Set([
    "id",
    "id_usuario",
    "id_salao",
    "created_at",
    "updated_at",
  ]);

  const resultado: Permissoes = {};

  Object.entries(permissoesDb).forEach(([key, value]) => {
    if (ignora.has(key)) return;
    resultado[key] = Boolean(value);
  });

  return resultado;
}
