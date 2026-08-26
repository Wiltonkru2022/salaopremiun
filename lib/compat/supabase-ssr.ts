import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

// Compatibilidade temporaria para imports antigos de @supabase/ssr.
// Nao abre conexao Supabase, nao usa URL/chave e nao faz refresh remoto.
// A sessao administrativa e resolvida exclusivamente pelo Clerk.
export function createServerClient() {
  return {
    auth: {
      async getUser() {
        const session = await readPainelClerkSession();
        return {
          data: {
            user: session
              ? {
                  id: session.clerkSubject,
                  email: session.email,
                  user_metadata: {
                    nome: session.nome,
                    id_salao: session.idSalao,
                    nivel: session.nivel,
                  },
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
                  user: {
                    id: session.clerkSubject,
                    email: session.email,
                  },
                }
              : null,
          },
          error: null,
        };
      },
    },
  } as any;
}
