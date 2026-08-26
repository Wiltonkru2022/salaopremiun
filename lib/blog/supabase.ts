import "server-only";
import { getNeonDatabaseClient, type NeonDatabaseClient } from "@/lib/neon/query-client.server";

export type BlogDatabaseClient = NeonDatabaseClient;

export function canUseBlogSupabasePublic() {
  return Boolean(String(process.env.NEON_DATABASE_URL || process.env.NEON_ADMIN_DATABASE_URL || "").trim());
}

export function canUseBlogSupabaseAdmin() {
  return Boolean(String(process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL || "").trim());
}

/**
 * Nomes legados preservados temporariamente para compatibilidade de imports.
 * Ambos retornam exclusivamente o cliente Neon e não acessam Supabase.
 */
export function getBlogSupabasePublic(): BlogDatabaseClient {
  return getNeonDatabaseClient();
}

export function getBlogSupabaseAdmin(): BlogDatabaseClient {
  return getNeonDatabaseClient();
}
