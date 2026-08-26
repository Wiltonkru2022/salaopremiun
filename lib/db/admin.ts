import "server-only";
import {
  getNeonDatabaseClient,
  type NeonDatabaseClient,
} from "@/lib/neon/query-client.server";

export type DatabaseAdminClient = NeonDatabaseClient;

export function getDatabaseAdmin(): DatabaseAdminClient {
  return getNeonDatabaseClient();
}
