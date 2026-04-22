import { createClient } from "@supabase/supabase-js";
import type { AnySupabaseDatabase } from "@/types/supabase";

type SupabaseAdminClient = ReturnType<typeof createClient<AnySupabaseDatabase>>;

const globalStore = globalThis as typeof globalThis & {
  __salaopremiumSupabaseAdmin?: SupabaseAdminClient;
};

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }
  return value;
}

function getServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }
  return value;
}

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() nao pode ser usado no client.");
  }

  if (globalStore.__salaopremiumSupabaseAdmin) {
    return globalStore.__salaopremiumSupabaseAdmin;
  }

  globalStore.__salaopremiumSupabaseAdmin = createClient<AnySupabaseDatabase>(
    getSupabaseUrl(),
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "x-application-name": "salaopremium-server-admin",
        },
      },
    }
  );

  return globalStore.__salaopremiumSupabaseAdmin;
}

export type { SupabaseAdminClient };
