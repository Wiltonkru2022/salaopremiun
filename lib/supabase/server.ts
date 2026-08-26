import "server-only";

/**
 * Ponte temporaria para imports legados.
 * Nao cria cliente Supabase: banco usa Neon e autenticacao administrativa usa Clerk.
 * Remover este arquivo quando os ultimos imports forem migrados para @/lib/db/server.
 */
export { createClient } from "@/lib/db/server";
