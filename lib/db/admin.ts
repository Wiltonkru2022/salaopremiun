import "server-only";
import {
  getNeonDatabaseClient,
  type NeonDatabaseClient,
} from "@/lib/neon/query-client.server";
export type DatabaseAdminClient = NeonDatabaseClient;

let databaseAdminClient: DatabaseAdminClient | null = null;

export function getDatabaseAdmin(): DatabaseAdminClient {
  if (!databaseAdminClient) {
    databaseAdminClient = getNeonDatabaseClient();
  }

  return databaseAdminClient;
}
