type RemoteFilter = { op: string; column?: string; value?: unknown };
type RemoteOrder = { column: string; ascending?: boolean; nullsFirst?: boolean };
type RemoteMutation =
  | { kind: "insert"; payload: unknown }
  | { kind: "update"; payload: unknown }
  | { kind: "delete" }
  | { kind: "upsert"; payload: unknown; options?: Record<string, unknown> };

type RemoteState = {
  kind: "query";
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

export type PainelSession = {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
};

async function request(body: unknown) {
  try {
    const response = await fetch("/api/painel/db", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") return payload as any;
    return {
      data: null,
      error: { message: `Falha HTTP ${response.status} ao acessar o Neon.` },
      count: null,
      status: response.status,
    };
  } catch (cause) {
    return {
      data: null,
      error: {
        message: cause instanceof Error ? cause.message : "Falha de rede ao acessar o Neon.",
      },
      count: null,
      status: 0,
    };
  }
}

function createBuilder(table: string) {
  const state: RemoteState = { kind: "query", table, filters: [], orders: [] };
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
      Object.entries(values || {}).forEach(([column, value]) =>
        state.filters.push({ op: "eq", column, value })
      );
      return builder;
    },
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
      state.orders.push({ column, ascending: options?.ascending, nullsFirst: options?.nullsFirst });
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
    async then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
      try {
        const result = await request(state);
        if (throwOnError && result?.error) throw new Error(result.error.message || "Falha no Neon.");
        return resolve(result);
      } catch (cause) {
        if (reject) return reject(cause);
        throw cause;
      }
    },
  };
  return builder;
}

async function getSession() {
  try {
    const response = await fetch("/api/painel/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as { user?: PainelSession["user"] | null } | null;
    if (!response.ok || !payload?.user?.id) return { data: { session: null }, error: null };
    return {
      data: {
        session: {
          access_token: "painel-clerk-session",
          user: payload.user,
        } satisfies PainelSession,
      },
      error: null,
    };
  } catch (cause) {
    return {
      data: { session: null },
      error: { message: cause instanceof Error ? cause.message : "Falha ao validar sessão Clerk." },
    };
  }
}

export const supabaseConfigured = true;

// Nome mantido apenas para compatibilidade dos imports das telas Vite.
// Este objeto não usa SDK, Auth, Realtime ou Storage do Supabase.
export const supabase: any = {
  from: (table: string) => createBuilder(table),
  rpc: (fn: string, args?: Record<string, unknown>) => request({ kind: "rpc", fn, args: args || {} }),
  auth: {
    getSession,
    async signOut() {
      const response = await fetch("/api/auth/painel/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      return { error: response.ok ? null : { message: "Não foi possível encerrar a sessão." } };
    },
    async signInWithPassword() {
      return {
        data: { session: null, user: null },
        error: { message: "O painel usa Clerk. Entre pela página de login segura." },
      };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
};
