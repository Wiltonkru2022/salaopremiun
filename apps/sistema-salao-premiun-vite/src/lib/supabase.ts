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

const apiBase = String(import.meta.env.VITE_PAINEL_API_BASE_URL || "").replace(/\/$/, "");
const endpoint = (path: string) => `${apiBase}${path}`;

export const supabaseConfigured = true;

async function remoteRequest(body: unknown) {
  try {
    const response = await fetch(endpoint("/api/painel/db"), {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") return payload;
    return {
      data: null,
      error: { message: `Falha HTTP ${response.status} ao acessar o Neon.` },
      count: null,
    };
  } catch (cause) {
    return {
      data: null,
      error: {
        message: cause instanceof Error ? cause.message : "Falha de rede ao acessar o Neon.",
      },
      count: null,
    };
  }
}

function createRemoteBuilder(table: string) {
  const state: RemoteState = { kind: "query", table, filters: [], orders: [] };
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
    then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
      return remoteRequest(state).then(resolve, reject);
    },
  };
  return builder;
}

async function readSession() {
  try {
    const response = await fetch(endpoint("/api/painel/session"), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const payload = await response.json().catch(() => null) as any;
    return response.ok && payload?.user?.id ? payload.user : null;
  } catch {
    return null;
  }
}

const auth = {
  async getSession() {
    const user = await readSession();
    return { data: { session: user ? { user } : null }, error: null };
  },
  async getUser() {
    const user = await readSession();
    return { data: { user }, error: null };
  },
  async signOut() {
    try {
      const response = await fetch(endpoint("/api/auth/painel/logout"), {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });
      return response.ok ? { error: null } : { error: { message: "Falha ao encerrar sessao Clerk." } };
    } catch (cause) {
      return { error: { message: cause instanceof Error ? cause.message : "Falha ao sair." } };
    }
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
};

/**
 * Nome exportado mantido apenas para compatibilidade das telas antigas.
 * Todas as consultas passam pela API autenticada do painel e executam no Neon.
 */
export const supabase: any = {
  from: (table: string) => createRemoteBuilder(table),
  rpc: (fn: string, args?: Record<string, unknown>) =>
    remoteRequest({ kind: "rpc", fn, args: args || {} }),
  auth,
};
