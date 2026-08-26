import "server-only";
import { getDatabaseAdmin, type DatabaseAdminClient } from "@/lib/db/admin";

export type BlogDatabaseClient = DatabaseAdminClient;

export function canUseBlogDatabase() {
  return Boolean(
    String(
      process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL || ""
    ).trim()
  );
}

export function getBlogDatabase(): BlogDatabaseClient {
  return getDatabaseAdmin();
}
