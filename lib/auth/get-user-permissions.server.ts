import "server-only";
import { unstable_cache } from "next/cache";
import { SELECT_USUARIOS_PERMISSOES } from "@/lib/db/selects";
import { getDatabaseAdmin } from "@/lib/db/admin";

export type UserPermissionsRow = Record<string, unknown> | null;

const getCachedUserPermissions = unstable_cache(
  async (idSalao: string, idUsuario: string): Promise<UserPermissionsRow> => {
    const databaseAdmin = getDatabaseAdmin();
    const { data, error } = await databaseAdmin
      .from("usuarios_permissoes")
      .select(SELECT_USUARIOS_PERMISSOES)
      .eq("id_usuario", idUsuario)
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Erro ao carregar permissoes do usuario.");
    }

    return (data as Record<string, unknown> | null) || null;
  },
  ["user-permissions"],
  {
    revalidate: 60,
  }
);

export async function getUserPermissionsRow(idSalao: string, idUsuario: string) {
  return getCachedUserPermissions(idSalao, idUsuario);
}
