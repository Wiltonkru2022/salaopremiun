import "server-only";
import {
  getDatabaseAdmin,
  type DatabaseAdminClient,
} from "@/lib/db/admin";

/**
 * Compatibilidade temporaria para imports antigos.
 * O retorno e o cliente administrativo Neon nativo.
 */
export type SupabaseAdminClient = DatabaseAdminClient;

export function getSupabaseAdmin(): SupabaseAdminClient {
  return getDatabaseAdmin();
}

/**
 * Nome legado preservado apenas para nao quebrar imports existentes.
 * Nao existe rollback para Supabase: o retorno continua sendo Neon.
 */
export function getRawSupabaseAdminForRollback(): SupabaseAdminClient {
  return getDatabaseAdmin();
}
