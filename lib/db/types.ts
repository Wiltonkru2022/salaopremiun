import type { DatabaseAdminClient } from "@/lib/db/admin";

export type DatabaseClient = DatabaseAdminClient;

export type DatabaseResult<T = unknown> = {
  data: T;
  error: { message?: string; code?: string } | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};
