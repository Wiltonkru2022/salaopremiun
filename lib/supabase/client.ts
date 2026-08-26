"use client";

/**
 * Ponte temporaria para imports legados.
 * Nao cria cliente Supabase: todo acesso passa pelo cliente Neon/Clerk.
 * Remover este arquivo quando os ultimos imports forem migrados para @/lib/db/client.
 */
export { createClient } from "@/lib/db/client";
