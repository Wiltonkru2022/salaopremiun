import { createNeonSupabaseCompat } from "@/lib/neon/supabase-compat.server";

/**
 * Nome mantido temporariamente para compatibilidade com imports antigos.
 * Nenhuma conexao Supabase e criada; consultas/RPCs sao executadas no Neon.
 */
export async function createClient() {
  return createNeonSupabaseCompat(null) as any;
}
