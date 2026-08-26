import "server-only";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { getProviderConfig } from "@/lib/platform/provider-config.server";

/**
 * Compatibilidade de nomes durante a retirada final do legado.
 * O blog usa o mesmo PostgreSQL Neon do restante do sistema.
 */
export function canUseBlogSupabasePublic() {
  return getProviderConfig().neonReady;
}

export function canUseBlogSupabaseAdmin() {
  return getProviderConfig().neonAdminReady;
}

export function getBlogSupabasePublic() {
  return getDatabaseAdmin();
}

export function getBlogSupabaseAdmin() {
  return getDatabaseAdmin();
}
