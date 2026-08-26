import "server-only";
import {
  getNeonDatabaseClient,
  type NeonDatabaseClient,
} from "@/lib/neon/query-client.server";
import {
  createClerkUser,
  deleteClerkUser,
  getClerkUser,
  updateClerkUser,
} from "@/lib/platform/clerk-admin.server";

type AuthAdminCompat = {
  createUser(input: {
    email: string;
    password: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, unknown>;
  }): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
  updateUserById(
    userId: string,
    input: {
      password?: string;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
      email?: string;
    }
  ): Promise<{ data: { user: { id: string; app_metadata?: Record<string, unknown> } | null }; error: { message: string } | null }>;
  deleteUser(userId: string): Promise<{ data: null; error: { message: string } | null }>;
  getUserById(userId: string): Promise<{ data: { user: { id: string; app_metadata?: Record<string, unknown> } | null }; error: { message: string } | null }>;
  mfa: {
    listFactors(input: { userId: string }): Promise<{ data: { factors: unknown[] }; error: null }>;
    deleteFactor(input: { id: string; userId: string }): Promise<{ data: null; error: { message: string } }>;
  };
};

export type DatabaseAdminClient = NeonDatabaseClient & {
  auth: { admin: AuthAdminCompat };
};

function authAdminCompat(): AuthAdminCompat {
  return {
    async createUser(input) {
      try {
        const user = await createClerkUser({
          email: input.email,
          password: input.password,
          nome: String(input.user_metadata?.nome || ""),
          publicMetadata: input.user_metadata || {},
        });
        return { data: { user: { id: user.id } }, error: null };
      } catch (cause) {
        return {
          data: { user: null },
          error: { message: cause instanceof Error ? cause.message : "Erro ao criar usuário Clerk." },
        };
      }
    },
    async updateUserById(userId, input) {
      try {
        const user = await updateClerkUser({
          userId,
          password: input.password,
          nome: String(input.user_metadata?.nome || "") || undefined,
          publicMetadata: input.user_metadata || input.app_metadata,
        });
        return {
          data: {
            user: {
              id: user.id,
              app_metadata: user.public_metadata || {},
            },
          },
          error: null,
        };
      } catch (cause) {
        return {
          data: { user: null },
          error: { message: cause instanceof Error ? cause.message : "Erro ao atualizar usuário Clerk." },
        };
      }
    },
    async deleteUser(userId) {
      try {
        await deleteClerkUser(userId);
        return { data: null, error: null };
      } catch (cause) {
        return {
          data: null,
          error: { message: cause instanceof Error ? cause.message : "Erro ao excluir usuário Clerk." },
        };
      }
    },
    async getUserById(userId) {
      try {
        const user = await getClerkUser(userId);
        return {
          data: {
            user: {
              id: user.id,
              app_metadata: user.public_metadata || {},
            },
          },
          error: null,
        };
      } catch (cause) {
        return {
          data: { user: null },
          error: { message: cause instanceof Error ? cause.message : "Erro ao consultar usuário Clerk." },
        };
      }
    },
    mfa: {
      async listFactors() {
        return { data: { factors: [] }, error: null };
      },
      async deleteFactor() {
        return {
          data: null,
          error: { message: "O MFA é administrado diretamente pelo Clerk." },
        };
      },
    },
  };
}

let cachedAdmin: DatabaseAdminClient | null = null;

export function getDatabaseAdmin(): DatabaseAdminClient {
  if (cachedAdmin) return cachedAdmin;
  const database = getNeonDatabaseClient();
  const auth = { admin: authAdminCompat() };
  cachedAdmin = new Proxy(database as DatabaseAdminClient, {
    get(target, property, receiver) {
      if (property === "auth") return auth;
      return Reflect.get(target, property, receiver);
    },
  });
  return cachedAdmin;
}
