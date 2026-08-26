import "server-only";
import {
  getNeonDatabaseClient,
  type NeonDatabaseClient,
} from "@/lib/neon/query-client.server";
import { clerkAdminCompat } from "@/lib/platform/clerk-admin.server";

export type DatabaseAdminClient = NeonDatabaseClient & {
  auth: {
    admin: typeof clerkAdminCompat;
  };
};

let databaseAdminClient: DatabaseAdminClient | null = null;

export function getDatabaseAdmin(): DatabaseAdminClient {
  if (!databaseAdminClient) {
    databaseAdminClient = Object.assign(getNeonDatabaseClient(), {
      auth: {
        admin: clerkAdminCompat,
      },
    });
  }

  return databaseAdminClient;
}
