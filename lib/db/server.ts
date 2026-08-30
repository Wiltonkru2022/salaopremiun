import "server-only";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export async function createClient(): Promise<any> {
  const database = getDatabaseAdmin();
  const auth = {
    async getUser() {
      const session = await readPainelClerkSession();
      return {
        data: {
          user: session
            ? {
                // Compatibilidade com o antigo Supabase Auth: o restante do
                // sistema espera que auth.getUser().user.id seja UUID.
                id: session.authUserId,
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
      const user = session
        ? {
            id: session.authUserId,
            email: session.email,
            user_metadata: { nome: session.nome },
          }
        : null;
      return {
        data: {
          session: user
            ? {
                access_token: "clerk-session",
                refresh_token: "",
                user,
              }
            : null,
        },
        error: null,
      };
    },
  };

  return new Proxy(database as any, {
    get(target, property, receiver) {
      if (property === "auth") return auth;
      return Reflect.get(target, property, receiver);
    },
  });
}
