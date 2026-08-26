import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  clearPainelClerkSession,
  readPainelClerkSession,
} from "@/lib/platform/painel-clerk-session.server";

/**
 * Compatibilidade temporaria para imports antigos de `@/lib/supabase/server`.
 * Nao cria cliente Supabase. Banco = Neon; autenticacao do painel = Clerk.
 */
export async function createClient() {
  const database = getDatabaseAdmin();

  return new Proxy(database as any, {
    get(target, property, receiver) {
      if (property === "auth") {
        return {
          async getUser() {
            const session = await readPainelClerkSession();
            return {
              data: {
                user: session
                  ? {
                      id: session.clerkSubject,
                      email: session.email,
                      user_metadata: { nome: session.nome },
                    }
                  : null,
              },
              error: null,
            };
          },
          async getSession() {
            const session = await readPainelClerkSession();
            return {
              data: {
                session: session
                  ? {
                      access_token: "painel-clerk-session",
                      refresh_token: "",
                      token_type: "bearer",
                      expires_in: 0,
                      expires_at: 0,
                      user: {
                        id: session.clerkSubject,
                        email: session.email,
                        user_metadata: { nome: session.nome },
                      },
                    }
                  : null,
              },
              error: null,
            };
          },
          async signOut() {
            await clearPainelClerkSession();
            return { error: null };
          },
        };
      }

      return Reflect.get(target as object, property, receiver);
    },
  });
}
