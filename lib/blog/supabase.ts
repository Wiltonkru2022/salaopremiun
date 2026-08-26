import "server-only";
import { getDatabaseAdmin } from "@/lib/db/admin";
import type { DatabaseAdminClient } from "@/lib/db/admin";

/**
 * Compatibilidade temporaria do blog durante a remocao de nomes legados.
 * O blog usa exclusivamente o banco Neon principal; nao existe cliente,
 * URL, anon key ou service role do Supabase neste modulo.
 */
export function canUseBlogSupabasePublic() {
  return Boolean(
    String(process.env.NEON_DATABASE_URL || process.env.NEON_ADMIN_DATABASE_URL || "").trim()
  );
}

export function canUseBlogSupabaseAdmin() {
  return Boolean(
    String(process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL || "").trim()
  );
}

export function getBlogSupabasePublic(): DatabaseAdminClient {
  return getDatabaseAdmin();
}

export function getBlogSupabaseAdmin(): DatabaseAdminClient {
  return getDatabaseAdmin();
}
