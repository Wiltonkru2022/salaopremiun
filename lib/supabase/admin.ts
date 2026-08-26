import type { AnySupabaseDatabase } from "@/types/supabase";
import { createNeonSupabaseCompat } from "@/lib/neon/supabase-compat.server";

/**
 * Nome mantido temporariamente por compatibilidade de imports antigos.
 * O objeto retornado NAO abre conexao com Supabase: todas as operacoes
 * de banco e RPC sao executadas pelo adaptador Neon.
 */
type SupabaseAdminClient = any;

const globalStore = globalThis as typeof globalThis & {
  __salaopremiumNeonAdminCompat?: SupabaseAdminClient;
};

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (typeof window !== "undefined") {
    throw new Error("O cliente administrativo de banco so pode ser usado no servidor.");
  }

  if (!globalStore.__salaopremiumNeonAdminCompat) {
    globalStore.__salaopremiumNeonAdminCompat = createNeonSupabaseCompat();
  }

  return globalStore.__salaopremiumNeonAdminCompat;
}

/**
 * Rollback para Supabase foi removido. Mantemos a exportacao apenas para
 * nao quebrar imports antigos; ela agora aponta para o mesmo backend Neon.
 */
export function getRawSupabaseAdminForRollback(): SupabaseAdminClient {
  return getSupabaseAdmin();
}

export type { SupabaseAdminClient };
export type { AnySupabaseDatabase };
