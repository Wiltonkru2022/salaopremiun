type Filter = { op: string; column?: string; value?: unknown };
type Order = { column: string; ascending?: boolean; nullsFirst?: boolean };
type State = {
  kind?: "query";
  table: string;
  select?: string;
  selectOptions?: Record<string, unknown>;
  mutation?: Record<string, unknown>;
  filters: Filter[];
  orders: Order[];
  limit?: number;
  range?: [number, number];
  single?: boolean;
  maybeSingle?: boolean;
};

async function request(body: unknown) {
  const response = await fetch("/api/painel/db", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === "object") return payload as any;
  return { data: null, error: { message: `Falha HTTP ${response.status}.` }, count: null };
}

function builder(table: string) {
  const state: State = { kind: "query", table, filters: [], orders: [] };
  const api: any = {
    select(columns = "*", options?: Record<string, unknown>) { state.select = columns; state.selectOptions = options; return api; },
    insert(payload: unknown) { state.mutation = { kind: "insert", payload }; return api; },
    update(payload: unknown) { state.mutation = { kind: "update", payload }; return api; },
    delete() { state.mutation = { kind: "delete" }; return api; },
    upsert(payload: unknown, options?: Record<string, unknown>) { state.mutation = { kind: "upsert", payload, options }; return api; },
    eq(column: string, value: unknown) { state.filters.push({ op: "eq", column, value }); return api; },
    neq(column: string, value: unknown) { state.filters.push({ op: "neq", column, value }); return api; },
    gt(column: string, value: unknown) { state.filters.push({ op: "gt", column, value }); return api; },
    gte(column: string, value: unknown) { state.filters.push({ op: "gte", column, value }); return api; },
    lt(column: string, value: unknown) { state.filters.push({ op: "lt", column, value }); return api; },
    lte(column: string, value: unknown) { state.filters.push({ op: "lte", column, value }); return api; },
    like(column: string, value: unknown) { state.filters.push({ op: "like", column, value }); return api; },
    ilike(column: string, value: unknown) { state.filters.push({ op: "ilike", column, value }); return api; },
    is(column: string, value: unknown) { state.filters.push({ op: "is", column, value }); return api; },
    in(column: string, value: unknown[]) { state.filters.push({ op: "in", column, value }); return api; },
    contains(column: string, value: unknown) { state.filters.push({ op: "contains", column, value }); return api; },
    or(value: string) { state.filters.push({ op: "or", value }); return api; },
    match(values: Record<string, unknown>) { Object.entries(values || {}).forEach(([column, value]) => state.filters.push({ op: "eq", column, value })); return api; },
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { state.orders.push({ column, ascending: options?.ascending, nullsFirst: options?.nullsFirst }); return api; },
    limit(value: number) { state.limit = value; return api; },
    range(from: number, to: number) { state.range = [from, to]; return api; },
    single() { state.single = true; return api; },
    maybeSingle() { state.maybeSingle = true; return api; },
    async then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
      try { return resolve(await request(state)); } catch (error) { if (reject) return reject(error); throw error; }
    },
  };
  return api;
}

async function getSessionPayload() {
  const response = await fetch("/api/painel/session", { cache: "no-store", credentials: "include" });
  const payload = await response.json().catch(() => null) as any;
  return response.ok ? payload : null;
}

export const supabaseConfigured = true;

/**
 * Nome preservado para evitar uma troca gigantesca de imports do app Vite.
 * Nao existe conexao com Supabase: consultas usam /api/painel/db -> Neon e auth usa Clerk.
 */
export const supabase: any = {
  from: (table: string) => builder(table),
  rpc: (fn: string, args?: Record<string, unknown>) => request({ kind: "rpc", fn, args: args || {} }),
  auth: {
    async getSession() {
      const payload = await getSessionPayload();
      return { data: { session: payload?.user ? { user: payload.user, usuario: payload.usuario } : null }, error: null };
    },
    async getUser() {
      const payload = await getSessionPayload();
      return { data: { user: payload?.user || null }, error: null };
    },
    async signOut() {
      const response = await fetch("/api/auth/painel/logout", { method: "POST", credentials: "include" });
      return response.ok ? { error: null } : { error: { message: "Nao foi possivel sair." } };
    },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
  },
  channel() { const channel: any = { on() { return channel; }, subscribe() { return channel; } }; return channel; },
  async removeChannel() { return "ok"; },
};
