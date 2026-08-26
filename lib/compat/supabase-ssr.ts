import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

// Compatibilidade temporaria para imports antigos de @supabase/ssr.
// Nao abre conexao Supabase, nao usa URL/chave e nao faz refresh remoto.
// Estes marcadores existem apenas para trechos legados que ainda validam
// a presenca das antigas variaveis antes de chamar createServerClient().
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://clerk-neon-compat.local";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "clerk-neon-compat";
}

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
