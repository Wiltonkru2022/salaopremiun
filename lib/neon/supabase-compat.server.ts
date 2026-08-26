import { Pool } from "@neondatabase/serverless";
import {
  executePainelNeonQuery,
  executePainelNeonRpc,
  type PainelDbFilter,
  type PainelDbMutation,
  type PainelDbOrder,
  type PainelDbQuery,
} from "@/lib/neon/painel-query.server";
import { resolveNeonRuntimeUrl } from "@/lib/neon/runtime-url.server";
import { getProviderConfig } from "@/lib/platform/provider-config.server";

type SupabaseLike = any;

type State = PainelDbQuery & {
  filters: PainelDbFilter[];
  orders: PainelDbOrder[];
};

let adminPool: Pool | null = null;
let adminPoolUrl = "";

function adminDatabaseUrl() {
  const url = resolveNeonRuntimeUrl(process.env.NEON_ADMIN_DATABASE_URL);
  if (!url) throw new Error("NEON_ADMIN_DATABASE_URL nao configurada.");
  return url;
}

function getAdminPool() {
  const url = adminDatabaseUrl();
  if (!adminPool || adminPoolUrl !== url) {
    adminPool = new Pool({ connectionString: url });
    adminPoolUrl = url;
  }
  return adminPool;
}

function neonEnabled() {
  return (
    getProviderConfig().database === "neon" &&
    Boolean(resolveNeonRuntimeUrl(process.env.NEON_ADMIN_DATABASE_URL))
  );
}

async function executeNeon(state: State) {
  const client = await getAdminPool().connect();
  try {
    return await executePainelNeonQuery(client, state);
  } finally {
    client.release();
  }
}

async function executeNeonRpc(fn: string, args?: Record<string, unknown>) {
  const client = await getAdminPool().connect();
  try {
    return await executePainelNeonRpc(client, { kind: "rpc", fn, args });
  } finally {
    client.release();
  }
}

function applySupabase(supabase: SupabaseLike, state: State) {
  let query: any = supabase.from(state.table);
  const mutation = state.mutation as PainelDbMutation | undefined;
  if (mutation?.kind === "insert") query = query.insert(mutation.payload);
  else if (mutation?.kind === "update") query = query.update(mutation.payload);
  else if (mutation?.kind === "delete") query = query.delete();
  else if (mutation?.kind === "upsert") query = query.upsert(mutation.payload, mutation.options);

  if (state.select) query = query.select(state.select, state.selectOptions);
  for (const filter of state.filters) {
    if (filter.op === "or") query = query.or(String(filter.value || ""));
    else query = query[filter.op](filter.column, filter.value);
  }
  for (const order of state.orders) {
    query = query.order(order.column, {
      ascending: order.ascending !== false,
      nullsFirst: order.nullsFirst,
    });
  }
  if (state.range) query = query.range(state.range[0], state.range[1]);
  else if (state.limit !== undefined) query = query.limit(state.limit);
  if (state.single) query = query.single();
  else if (state.maybeSingle) query = query.maybeSingle();
  return query;
}

function createBuilder(supabase: SupabaseLike, table: string) {
  const state: State = {
    kind: "query",
    table,
    filters: [],
    orders: [],
  };
  let throwOnError = false;

  const builder: any = {
    select(columns = "*", options?: { count?: string; head?: boolean }) {
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
    upsert(payload: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
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
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
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
        const result = neonEnabled()
          ? await executeNeon(state)
          : await applySupabase(supabase, state);
        if (throwOnError && result?.error) {
          throw Object.assign(
            new Error(result.error.message || "Falha na operacao de banco."),
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

export function createNeonSupabaseCompat(supabase: SupabaseLike): SupabaseLike {
  return new Proxy(supabase, {
    get(target, property, receiver) {
      if (property === "from") {
        return (table: string) => createBuilder(supabase, table);
      }
      if (property === "rpc") {
        return async (fn: string, args?: Record<string, unknown>) => {
          if (neonEnabled()) return executeNeonRpc(fn, args);
          return supabase.rpc(fn, args);
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}
