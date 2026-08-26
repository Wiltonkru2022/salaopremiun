import { createNeonSupabaseCompat } from "@/lib/neon/supabase-compat.server";

/**
 * Compatibilidade temporaria para imports antigos de createClient().
 * O cliente retornado usa exclusivamente Neon para banco/RPC.
 * Auth administrativo e feito pelo Clerk; cliente/profissional usam sessao interna.
 */
export async function createClient() {
  return createNeonSupabaseCompat();
}
