import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnySupabaseDatabase } from "@/types/supabase";
import { getSupabaseCookieOptions } from "./cookie-options";

type AppSupabaseClient = SupabaseClient<AnySupabaseDatabase>;
type RemoteFilter = { op: string; column?: string; value?: unknown };
type RemoteOrder = { column: string; ascending?: boolean; nullsFirst?: boolean };
type RemoteMutation =
  | { kind: "insert"; payload: unknown }
  | { kind: "update"; payload: unknown }
  | { kind: "delete" }
  | { kind: "upsert"; payload: unknown; options?: Record<string, unknown> };

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

let rawBrowserClient: AppSupabaseClient | null = null;
let painelBrowserClient: AppSupabaseClient | null = null;

function isPainelHost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  const configured = String(
    process.env.NEXT_PUBLIC_APP_PAINEL_HOST || "painel.salaopremiun.com.br"
  )
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return hostname === configured || hostname === "painel.salaopremiun.com.br";
}

async function remoteRequest(body: unknown) {
  try {
    const response = await fetch("/api/painel/db", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as any;
    if (payload && typeof payload === "object") return payload;
    return {
      data: null,
      error: { message: `Falha HTTP ${response.status} ao acessar dados do painel.` },
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
            : "Falha de rede ao acessar dados do painel.",
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
    select(columns = "*", options?: Record<string, unknown>) {
      state.select = columns;
      state.selectOptions = options;
      return builder;
    },
    insert(payload: unknown) {
      state.mutation = { kind: "insert", payload };
      return builder;
    },
    update(payload: unknown) {
      state.mutation = { kind: "update", payload };
      return builder;
    },
    delete() {
      state.mutation = { kind: "delete" };
      return builder;
    },
    upsert(payload: unknown, options?: Record<string, unknown>) {
      state.mutation = { kind: "upsert", payload, options };
      return builder;
    },
    eq(column: string, value: unknown) {
      state.filters.push({ op: "eq", column, value });
      return builder;
    },
    neq(column: string, value: unknown) {
      state.filters.push({ op: "neq", column, value });
      return builder;
    },
    gt(column: string, value: unknown) {
      state.filters.push({ op: "gt", column, value });
      return builder;
    },
    gte(column: string, value: unknown) {
      state.filters.push({ op: "gte", column, value });
      return builder;
    },
    lt(column: string, value: unknown) {
      state.filters.push({ op: "lt", column, value });
      return builder;
    },
    lte(column: string, value: unknown) {
      state.filters.push({ op: "lte", column, value });
      return builder;
    },
    like(column: string, value: unknown) {
      state.filters.push({ op: "like", column, value });
      return builder;
    },
    ilike(column: string, value: unknown) {
      state.filters.push({ op: "ilike", column, value });
      return builder;
    },
    is(column: string, value: unknown) {
      state.filters.push({ op: "is", column, value });
      return builder;
    },
    in(column: string, value: unknown[]) {
      state.filters.push({ op: "in", column, value });
      return builder;
    },
    contains(column: string, value: unknown) {
      state.filters.push({ op: "contains", column, value });
      return builder;
    },
    or(value: string) {
      state.filters.push({ op: "or", value });
      return builder;
    },
    match(values: Record<string, unknown>) {
      Object.entries(values || {}).forEach(([column, value]) => {
        state.filters.push({ op: "eq", column, value });
      });
      return builder;
    },
    order(
      column: string,
      options?: { ascending?: boolean; nullsFirst?: boolean }
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
          throw Object.assign(new Error(result.error.message || "Erro na consulta."), result.error);
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

function createPainelAuthProxy() {
  const target: Record<string, unknown> = {};
  return new Proxy(target as any, {
    get(_target, property) {
      if (property === "getUser") {
        return async () => {
          try {
            const response = await fetch("/api/painel/session", {
              method: "GET",
              cache: "no-store",
              credentials: "same-origin",
            });
            const payload = (await response.json().catch(() => null)) as PainelSessionPayload | null;
            if (response.ok && payload?.user?.id) {
              return { data: { user: payload.user }, error: null };
            }
            return { data: { user: null }, error: null };
          } catch (cause) {
            return {
              data: { user: null },
              error: {
                message:
                  cause instanceof Error
                    ? cause.message
                    : "Falha ao validar sessao Clerk do painel.",
              },
            };
          }
        };
      }

      if (property === "getSession") {
        return async () => {
          try {
            const response = await fetch("/api/painel/session", {
              method: "GET",
              cache: "no-store",
              credentials: "same-origin",
            });
            const payload = (await response.json().catch(() => null)) as PainelSessionPayload | null;
            if (response.ok && payload?.user?.id) {
              return {
                data: {
                  session: {
                    access_token: "painel-clerk-session",
                    refresh_token: "",
                    token_type: "bearer",
                    expires_in: 0,
                    expires_at: 0,
                    user: payload.user,
                  },
                },
                error: null,
              };
            }
            return { data: { session: null }, error: null };
          } catch (cause) {
            return {
              data: { session: null },
              error: {
                message:
                  cause instanceof Error
                    ? cause.message
                    : "Falha ao validar sessao Clerk do painel.",
              },
            };
          }
        };
      }

      if (property === "signOut") {
        return async () => {
          try {
            const response = await fetch("/api/auth/painel/logout", {
              method: "POST",
              cache: "no-store",
              credentials: "same-origin",
            });
            if (!response.ok) {
              return { error: { message: "Nao foi possivel encerrar a sessao do painel." } };
            }
            return { error: null };
          } catch (cause) {
            return {
              error: {
                message: cause instanceof Error ? cause.message : "Falha ao sair do painel.",
              },
            };
          }
        };
      }

      if (property === "onAuthStateChange") {
        return () => ({
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        });
      }

      return undefined;
    },
  });
}

function createNoopRealtimeChannel() {
  const channel: any = {
    on() {
      return channel;
    },
    subscribe(callback?: (status: string) => void) {
      callback?.("SUBSCRIBED");
      return channel;
    },
    unsubscribe: async () => "ok",
  };
  return channel;
}

function createPainelClient(): AppSupabaseClient {
  const auth = createPainelAuthProxy();
  const target: Record<string, unknown> = {};
  return new Proxy(target as any, {
    get(_target, property) {
      if (property === "from") {
        return (table: string) => createRemoteBuilder(table);
      }
      if (property === "rpc") {
        return async (fn: string, args?: Record<string, unknown>) =>
          remoteRequest({ kind: "rpc", fn, args: args || {} });
      }
      if (property === "auth") return auth;
      if (property === "channel") return () => createNoopRealtimeChannel();
      if (property === "removeChannel") return async () => "ok";
      if (property === "removeAllChannels") return async () => [];
      if (property === "getChannels") return () => [];
      return undefined;
    },
  }) as AppSupabaseClient;
}

function getRawBrowserClient(): AppSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurada.");

  if (!rawBrowserClient) {
    rawBrowserClient = createBrowserClient<AnySupabaseDatabase>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookieOptions: getSupabaseCookieOptions(
          typeof window === "undefined" ? undefined : window.location.hostname
        ),
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
        },
      }
    );
  }
  return rawBrowserClient;
}

export function createClient(): AppSupabaseClient {
  if (isPainelHost()) {
    if (!painelBrowserClient) painelBrowserClient = createPainelClient();
    return painelBrowserClient;
  }
  return getRawBrowserClient();
}
