import { createClient } from "@supabase/supabase-js";
import type { AnySupabaseDatabase } from "@/types/supabase";
import { createNeonSupabaseCompat } from "@/lib/neon/supabase-compat.server";
import { getProviderConfig } from "@/lib/platform/provider-config.server";

type SupabaseAdminClient = ReturnType<typeof createClient<AnySupabaseDatabase>>;

const globalStore = globalThis as typeof globalThis & {
  __salaopremiumSupabaseAdminRaw?: SupabaseAdminClient;
  __salaopremiumSupabaseAdminCompat?: SupabaseAdminClient;
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

function getRawSupabaseAdmin(): SupabaseAdminClient {
  if (globalStore.__salaopremiumSupabaseAdminRaw) {
    return globalStore.__salaopremiumSupabaseAdminRaw;
  }

  globalStore.__salaopremiumSupabaseAdminRaw = createClient<AnySupabaseDatabase>(
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
  return globalStore.__salaopremiumSupabaseAdminRaw;
}

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() nao pode ser usado no client.");
  }

  const raw = getRawSupabaseAdmin();
  if (getProviderConfig().database !== "neon") {
    return raw;
  }

  if (!globalStore.__salaopremiumSupabaseAdminCompat) {
    globalStore.__salaopremiumSupabaseAdminCompat = createNeonSupabaseCompat(
      raw
    ) as SupabaseAdminClient;
  }
  return globalStore.__salaopremiumSupabaseAdminCompat;
}

export function getRawSupabaseAdminForRollback(): SupabaseAdminClient {
  if (typeof window !== "undefined") {
    throw new Error("getRawSupabaseAdminForRollback() nao pode ser usado no client.");
  }
  return getRawSupabaseAdmin();
}

export type { SupabaseAdminClient };
