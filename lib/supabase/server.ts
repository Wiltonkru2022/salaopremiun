import "server-only";
import { getNeonDatabaseClient } from "@/lib/neon/query-client.server";
import {
  clearPainelClerkSession,
  readPainelClerkSession,
} from "@/lib/platform/painel-clerk-session.server";

function clerkUser(session: Awaited<ReturnType<typeof readPainelClerkSession>>) {
  if (!session) return null;
  return {
    id: session.clerkSubject,
    email: session.email,
    user_metadata: {
      nome: session.nome,
      id_salao: session.idSalao,
      nivel: session.nivel,
      status: session.status,
    },
  };
}

function disabledLegacyAuth(method: string) {
  return async () => ({
    data: null,
    error: {
      message: `${method} do Supabase Auth foi desativado. Use Clerk ou a autenticação interna da superfície.`,
      status: 410,
    },
  });
}

/**
 * Nome mantido temporariamente para não quebrar imports antigos.
 * Este cliente não carrega @supabase/ssr nem conversa com Supabase.
 * Banco/RPC usam Neon; sessão administrativa usa Clerk.
 */
export async function createClient() {
  const database = getNeonDatabaseClient();

  const auth = {
    async getUser() {
      const session = await readPainelClerkSession();
      return { data: { user: clerkUser(session) }, error: null };
    },
    async getSession() {
      const session = await readPainelClerkSession();
      const user = clerkUser(session);
      return {
        data: {
          session: user
            ? {
                access_token: "painel-clerk-session",
                refresh_token: "",
                token_type: "bearer",
                expires_in: 0,
                expires_at: 0,
                user,
              }
            : null,
        },
        error: null,
      };
    },
    async getClaims() {
      const session = await readPainelClerkSession();
      return {
        data: session
          ? {
              claims: {
                sub: session.clerkSubject,
                aal: session.mfaVerified ? "aal2" : "aal1",
                email: session.email,
              },
            }
          : null,
        error: null,
      };
    },
    async signOut() {
      await clearPainelClerkSession();
      return { error: null };
    },
    signInWithPassword: disabledLegacyAuth("signInWithPassword"),
    signInWithOAuth: disabledLegacyAuth("signInWithOAuth"),
    exchangeCodeForSession: disabledLegacyAuth("exchangeCodeForSession"),
    resetPasswordForEmail: disabledLegacyAuth("resetPasswordForEmail"),
    updateUser: disabledLegacyAuth("updateUser"),
    mfa: {
      async getAuthenticatorAssuranceLevel() {
        const session = await readPainelClerkSession();
        return {
          data: {
            currentLevel: session?.mfaVerified ? "aal2" : "aal1",
            nextLevel: session?.mfaVerified ? "aal2" : "aal1",
            currentAuthenticationMethods: [],
          },
          error: null,
        };
      },
      async listFactors() {
        return { data: { all: [], totp: [], phone: [] }, error: null };
      },
      enroll: disabledLegacyAuth("mfa.enroll"),
      challenge: disabledLegacyAuth("mfa.challenge"),
      verify: disabledLegacyAuth("mfa.verify"),
      unenroll: disabledLegacyAuth("mfa.unenroll"),
    },
  };

  return {
    from: database.from,
    rpc: database.rpc,
    auth,
  } as any;
}
