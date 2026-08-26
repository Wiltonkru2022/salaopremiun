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

type State = PainelDbQuery & {
  filters: PainelDbFilter[];
  orders: PainelDbOrder[];
};

let adminPool: Pool | null = null;
let adminPoolUrl = "";

function databaseUrl() {
  const url = resolveNeonRuntimeUrl(
    process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL
  );
  if (!url) {
    throw new Error(
      "Neon nao configurado. Defina NEON_ADMIN_DATABASE_URL ou NEON_DATABASE_URL."
    );
  }
  return url;
}

function getPool() {
  const url = databaseUrl();
  if (!adminPool || adminPoolUrl !== url) {
    adminPool = new Pool({ connectionString: url });
    adminPoolUrl = url;
  }
  return adminPool;
}

async function executeQuery(state: State) {
  const client = await getPool().connect();
  try {
    return await executePainelNeonQuery(client, state);
  } finally {
    client.release();
  }
}

async function executeRpc(fn: string, args?: Record<string, unknown>) {
  const client = await getPool().connect();
  try {
    return await executePainelNeonRpc(client, { kind: "rpc", fn, args });
  } finally {
    client.release();
  }
}

function createBuilder(table: string) {
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
      state.mutation = { kind: "insert", payload } as PainelDbMutation;
      return builder;
    },
    update(payload: unknown) {
      state.mutation = { kind: "update", payload } as PainelDbMutation;
      return builder;
    },
    delete() {
      state.mutation = { kind: "delete" } as PainelDbMutation;
      return builder;
    },
    upsert(payload: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
      state.mutation = { kind: "upsert", payload, options } as PainelDbMutation;
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
        const result = await executeQuery(state);
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

export type NeonDatabaseClient = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<any>;
};

const neonDatabaseClient: NeonDatabaseClient = {
  from(table: string) {
    return createBuilder(table);
  },
  rpc(fn: string, args?: Record<string, unknown>) {
    return executeRpc(fn, args);
  },
};

export function getNeonDatabaseClient(): NeonDatabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("O cliente Neon administrativo so pode ser usado no servidor.");
  }
  return neonDatabaseClient;
}
