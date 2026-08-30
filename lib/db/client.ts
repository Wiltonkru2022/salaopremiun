"use client";

import type {
  NeonQueryBuilder,
  NeonQueryResult,
} from "@/lib/neon/query-client.server";

type BrowserAuthClient = {
  getUser(): Promise<{
    data: {
      user: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      } | null;
    };
    error: null;
  }>;
  getSession(): Promise<any>;
  signOut(options?: unknown): Promise<any>;
};

type BrowserDatabaseClient = {
  from<T = any>(table: string): NeonQueryBuilder<T>;
  rpc<T = any>(
    fn: string,
    args?: Record<string, unknown>
  ): Promise<NeonQueryResult<T>>;
  auth: BrowserAuthClient;
};

type RemoteFilter = {
  op: string;
  column?: string;
  value?: unknown;
};

type RemoteOrder = {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
};

type RemoteMutation =
  | { kind: "insert"; payload: unknown }
  | { kind: "update"; payload: unknown }
  | { kind: "delete"; options?: { count?: string } }
  | {
      kind: "upsert";
      payload: unknown;
      options?: Record<string, unknown>;
    };

type RemoteState = {
  kind?: "query";
  table: string;
  select?: string;
  selectOptions?: Record<string, unknown>;
  mutation?: RemoteMutation;
  filters: RemoteFilter[];
  orders: RemoteOrder[];
  limit?: number;
  range?: [number, number];
  single?: boolean;
  maybeSingle?: boolean;
};

type PainelSessionPayload = {
  user?: {
    id?: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
};

type BrowserClerk = {
  loaded?: boolean;
  load?: () => Promise<void>;
  signOut?: () => Promise<void>;
};

type WindowWithClerk = Window &
  typeof globalThis & {
    Clerk?: BrowserClerk;
  };

let browserClient: any = null;

async function remoteRequest(body: unknown) {
  try {
    const response = await fetch("/api/painel/db", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response
      .json()
      .catch(() => null)) as any;

    if (payload && typeof payload === "object") {
      if (!response.ok && !payload.error) {
        return {
          ...payload,
          data: payload.data ?? null,
          error: {
            message: `Falha HTTP ${response.status} ao acessar o Neon.`,
          },
          count: payload.count ?? null,
          status: response.status,
          statusText: response.statusText,
        };
      }

      return {
        ...payload,
        status: payload.status ?? response.status,
        statusText:
          payload.statusText ?? response.statusText,
      };
    }

    return {
      data: null,
      error: {
        message: `Falha HTTP ${response.status} ao acessar o Neon.`,
      },
      count: null,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (cause) {
    return {
      data: null,
      error: {
        message:
          cause instanceof Error
            ? cause.message
            : "Falha de rede ao acessar o Neon.",
      },
      count: null,
      status: 0,
      statusText: "Network Error",
    };
  }
}

function createRemoteBuilder(table: string) {
  const state: RemoteState = {
    kind: "query",
    table,
    filters: [],
    orders: [],
  };

  let throwOnError = false;

  const builder: any = {
    select(
      columns = "*",
      options?: Record<string, unknown>
    ) {
      state.select = columns;
      state.selectOptions = options;
      return builder;
    },

    insert(payload: unknown) {
      state.mutation = {
        kind: "insert",
        payload,
      };
      return builder;
    },

    update(payload: unknown) {
      state.mutation = {
        kind: "update",
        payload,
      };
      return builder;
    },

    delete(options?: { count?: string }) {
      state.mutation = {
        kind: "delete",
        options,
      };
      return builder;
    },

    upsert(
      payload: unknown,
      options?: Record<string, unknown>
    ) {
      state.mutation = {
        kind: "upsert",
        payload,
        options,
      };
      return builder;
    },

    eq(column: string, value: unknown) {
      state.filters.push({
        op: "eq",
        column,
        value,
      });
      return builder;
    },

    neq(column: string, value: unknown) {
      state.filters.push({
        op: "neq",
        column,
        value,
      });
      return builder;
    },

    gt(column: string, value: unknown) {
      state.filters.push({
        op: "gt",
        column,
        value,
      });
      return builder;
    },

    gte(column: string, value: unknown) {
      state.filters.push({
        op: "gte",
        column,
        value,
      });
      return builder;
    },

    lt(column: string, value: unknown) {
      state.filters.push({
        op: "lt",
        column,
        value,
      });
      return builder;
    },

    lte(column: string, value: unknown) {
      state.filters.push({
        op: "lte",
        column,
        value,
      });
      return builder;
    },

    like(column: string, value: unknown) {
      state.filters.push({
        op: "like",
        column,
        value,
      });
      return builder;
    },

    ilike(column: string, value: unknown) {
      state.filters.push({
        op: "ilike",
        column,
        value,
      });
      return builder;
    },

    is(column: string, value: unknown) {
      state.filters.push({
        op: "is",
        column,
        value,
      });
      return builder;
    },

    in(column: string, value: unknown[]) {
      state.filters.push({
        op: "in",
        column,
        value,
      });
      return builder;
    },

    contains(column: string, value: unknown) {
      state.filters.push({
        op: "contains",
        column,
        value,
      });
      return builder;
    },

    not(
      column: string,
      operator: string,
      value: unknown
    ) {
      state.filters.push({
        op: "not",
        column,
        value: {
          operator,
          value,
        },
      });
      return builder;
    },

    or(value: string) {
      state.filters.push({
        op: "or",
        value,
      });
      return builder;
    },

    match(values: Record<string, unknown>) {
      Object.entries(values || {}).forEach(
        ([column, value]) =>
          state.filters.push({
            op: "eq",
            column,
            value,
          })
      );

      return builder;
    },

    order(
      column: string,
      options?: {
        ascending?: boolean;
        nullsFirst?: boolean;
      }
    ) {
      state.orders.push({
        column,
        ascending: options?.ascending,
        nullsFirst: options?.nullsFirst,
      });
      return builder;
    },

    limit(value: number) {
      state.limit = value;
      return builder;
    },

    range(from: number, to: number) {
      state.range = [from, to];
      return builder;
    },

    single() {
      state.single = true;
      return builder;
    },

    maybeSingle() {
      state.maybeSingle = true;
      return builder;
    },

    throwOnError() {
      throwOnError = true;
      return builder;
    },

    async then(
      resolve: (value: any) => unknown,
      reject?: (reason: unknown) => unknown
    ) {
      try {
        const result = await remoteRequest(state);

        if (throwOnError && result?.error) {
          throw Object.assign(
            new Error(
              result.error.message ||
                "Erro na consulta Neon."
            ),
            result.error
          );
        }

        return resolve(result);
      } catch (cause) {
        if (reject) return reject(cause);
        throw cause;
      }
    },
  };

  return builder;
}

async function readSession() {
  try {
    const response = await fetch("/api/painel/session", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    const payload = (await response
      .json()
      .catch(() => null)) as PainelSessionPayload | null;

    return response.ok && payload?.user?.id
      ? payload.user
      : null;
  } catch {
    return null;
  }
}

function createAuthProxy() {
  return {
    async getUser() {
      const user = await readSession();

      return {
        data: {
          user,
        },
        error: null,
      };
    },

    async getSession() {
      const user = await readSession();

      return {
        data: {
          session: user
            ? {
                access_token: "clerk-session",
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

    async signOut() {
      let clerkError: unknown = null;
      let localSessionError: unknown = null;

      /*
       * 1. Encerra a sessão REAL do Clerk no navegador.
       *
       * Sem isso, o Clerk continua autenticado e a tela de login
       * pode recriar a sessão interna do SalãoPremium.
       */
      try {
        const clerk = (window as WindowWithClerk).Clerk;

        if (clerk?.load && !clerk.loaded) {
          await clerk.load();
        }

        if (clerk?.signOut) {
          await clerk.signOut();
        }
      } catch (cause) {
        clerkError = cause;
      }

      /*
       * 2. Sempre remove também a sessão interna do painel.
       */
      try {
        const response = await fetch(
          "/api/auth/painel/logout",
          {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );

        if (!response.ok) {
          localSessionError = new Error(
            `Falha HTTP ${response.status} ao remover a sessão local.`
          );
        }
      } catch (cause) {
        localSessionError = cause;
      }

      if (clerkError && localSessionError) {
        return {
          error: {
            message:
              clerkError instanceof Error
                ? clerkError.message
                : localSessionError instanceof Error
                  ? localSessionError.message
                  : "Não foi possível encerrar a sessão.",
          },
        };
      }

      return {
        error: null,
      };
    },
  };
}

export function createClient(): BrowserDatabaseClient {
  if (browserClient) return browserClient;

  const auth = createAuthProxy();

  browserClient = new Proxy(
    {} as Record<string, unknown>,
    {
      get(_target, property) {
        if (property === "from") {
          return (table: string) =>
            createRemoteBuilder(table);
        }

        if (property === "rpc") {
          return (
            fn: string,
            args?: Record<string, unknown>
          ) =>
            remoteRequest({
              kind: "rpc",
              fn,
              args: args || {},
            });
        }

        if (property === "auth") {
          return auth;
        }

        return undefined;
      },
    }
  );

  return browserClient as BrowserDatabaseClient;
}
