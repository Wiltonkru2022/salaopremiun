import "server-only";
import {
  getNeonDatabaseClient,
  type NeonDatabaseClient,
} from "@/lib/neon/query-client.server";
import { clerkAdminCompat } from "@/lib/platform/clerk-admin.server";
import { cloudinaryStorageCompat } from "@/lib/platform/cloudinary-storage-compat.server";

export type DatabaseAdminClient = NeonDatabaseClient & {
  auth: {
    admin: typeof clerkAdminCompat;
  };
  storage: typeof cloudinaryStorageCompat;
};

let databaseAdminClient: DatabaseAdminClient | null = null;

export function getDatabaseAdmin(): DatabaseAdminClient {
  if (!databaseAdminClient) {
    databaseAdminClient = Object.assign(getNeonDatabaseClient(), {
      auth: {
        admin: clerkAdminCompat,
      },
      storage: cloudinaryStorageCompat,
    });
  }

  return databaseAdminClient;
}
