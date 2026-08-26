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

type SupabaseLike = any;

type PostFilter = {
  column: string;
  operator: string;
  value: unknown;
  negate?: boolean;
};

type State = PainelDbQuery & {
  filters: PainelDbFilter[];
  orders: PainelDbOrder[];
  postFilters: PostFilter[];
};

let adminPool: Pool | null = null;
let adminPoolUrl = "";

const SIMPLE_COLUMN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function adminDatabaseUrl() {
  const url = resolveNeonRuntimeUrl(
    process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL
  );
  if (!url) throw new Error("Neon nao configurado. Defina NEON_ADMIN_DATABASE_URL ou NEON_DATABASE_URL.");
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

async function executeNeon(state: PainelDbQuery) {
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

function readJsonPath(row: Record<string, unknown>, column: string) {
  if (SIMPLE_COLUMN.test(column)) return row[column];
  const parts = column
    .split(/->>?/g)
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
  if (!parts.length || !SIMPLE_COLUMN.test(parts[0])) return undefined;
  let current: unknown = row[parts[0]];
  for (const part of parts.slice(1)) {
    if (!SIMPLE_COLUMN.test(part) || !current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function compareLike(actual: unknown, expected: unknown, insensitive: boolean) {
  const source = String(actual ?? "");
  const pattern = String(expected ?? "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/%/g, ".*")
    .replace(/_/g, ".");
  return new RegExp(`^${pattern}$`, insensitive ? "i" : "").test(source);
}

function compareFilter(actual: unknown, operator: string, expected: unknown) {
  switch (operator) {
    case "eq": return actual === expected || String(actual ?? "") === String(expected ?? "");
    case "neq": return !(actual === expected || String(actual ?? "") === String(expected ?? ""));
    case "gt": return Number(actual) > Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "is":
      if (expected === null) return actual === null || actual === undefined;
      if (expected === true) return actual === true;
      if (expected === false) return actual === false;
      return false;
    case "like": return compareLike(actual, expected, false);
    case "ilike": return compareLike(actual, expected, true);
    case "in": return Array.isArray(expected) && expected.some((item) => String(item) === String(actual));
    case "contains": {
      if (Array.isArray(actual) && Array.isArray(expected)) {
        return expected.every((item) => actual.some((candidate) => String(candidate) === String(item)));
      }
      if (actual && expected && typeof actual === "object" && typeof expected === "object") {
        return Object.entries(expected as Record<string, unknown>).every(
          ([key, value]) => String((actual as Record<string, unknown>)[key] ?? "") === String(value ?? "")
        );
      }
      return false;
    }
    default: throw new Error(`Filtro de compatibilidade nao suportado: ${operator}`);
  }
}

function applyPostFilters(rows: unknown[], filters: PostFilter[]) {
  if (!filters.length) return rows;
  return rows.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return filters.every((filter) => {
      const matched = compareFilter(readJsonPath(row, filter.column), filter.operator, filter.value);
      return filter.negate ? !matched : matched;
    });
  });
}

function inverseOperator(operator: string): PainelDbFilter["op"] | null {
  switch (operator) {
    case "eq": return "neq";
    case "neq": return "eq";
    case "gt": return "lte";
    case "gte": return "lt";
    case "lt": return "gte";
    case "lte": return "gt";
    default: return null;
  }
}

function createBuilder(_legacyTarget: SupabaseLike, table: string) {
  const state: State = { kind: "query", table, filters: [], orders: [], postFilters: [] };
  let throwOnError = false;

  function addFilter(op: PainelDbFilter["op"], column: string, value: unknown) {
    if (op !== "or" && !SIMPLE_COLUMN.test(column)) {
      state.postFilters.push({ column, operator: op, value });
      return builder;
    }
    state.filters.push({ op, column, value });
    return builder;
  }

  const builder: any = {
    select(columns = "*", options?: { count?: string; head?: boolean }) { state.select = columns; state.selectOptions = options; return builder; },
    insert(payload: unknown) { state.mutation = { kind: "insert", payload }; return builder; },
    update(payload: unknown) { state.mutation = { kind: "update", payload }; return builder; },
    delete() { state.mutation = { kind: "delete" }; return builder; },
    upsert(payload: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) { state.mutation = { kind: "upsert", payload, options }; return builder; },
    eq(column: string, value: unknown) { return addFilter("eq", column, value); },
    neq(column: string, value: unknown) { return addFilter("neq", column, value); },
    gt(column: string, value: unknown) { return addFilter("gt", column, value); },
    gte(column: string, value: unknown) { return addFilter("gte", column, value); },
    lt(column: string, value: unknown) { return addFilter("lt", column, value); },
    lte(column: string, value: unknown) { return addFilter("lte", column, value); },
    like(column: string, value: unknown) { return addFilter("like", column, value); },
    ilike(column: string, value: unknown) { return addFilter("ilike", column, value); },
    is(column: string, value: unknown) { return addFilter("is", column, value); },
    in(column: string, value: unknown[]) { return addFilter("in", column, value); },
    contains(column: string, value: unknown) { return addFilter("contains", column, value); },
    not(column: string, operator: string, value: unknown) {
      const normalized = String(operator || "").trim().toLowerCase();
      const inverse = SIMPLE_COLUMN.test(column) ? inverseOperator(normalized) : null;
      if (inverse) return addFilter(inverse, column, value);
      state.postFilters.push({ column, operator: normalized, value, negate: true });
      return builder;
    },
    filter(column: string, operator: string, value: unknown) {
      const normalized = String(operator || "").trim().toLowerCase();
      if (normalized.startsWith("not.")) return builder.not(column, normalized.slice(4), value);
      const allowed = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "contains"]);
      if (!allowed.has(normalized)) throw new Error(`Operador filter nao suportado no Neon: ${operator}`);
      return addFilter(normalized as PainelDbFilter["op"], column, value);
    },
    or(value: string) { state.filters.push({ op: "or", value }); return builder; },
    match(values: Record<string, unknown>) { Object.entries(values || {}).forEach(([column, value]) => addFilter("eq", column, value)); return builder; },
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { state.orders.push({ column, ascending: options?.ascending, nullsFirst: options?.nullsFirst }); return builder; },
    limit(value: number) { state.limit = value; return builder; },
    range(from: number, to: number) { state.range = [from, to]; return builder; },
    single() { state.single = true; return builder; },
    maybeSingle() { state.maybeSingle = true; return builder; },
    throwOnError() { throwOnError = true; return builder; },
    async then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
      try {
        if (state.mutation && state.postFilters.length) {
          throw new Error("Mutacao com filtro JSON/NOT complexo nao e permitida no adaptador Neon.");
        }
        const hasPostFilters = state.postFilters.length > 0;
        const queryForNeon: PainelDbQuery = {
          ...state,
          filters: state.filters,
          ...(hasPostFilters ? { range: undefined, limit: undefined, single: false, maybeSingle: false, selectOptions: state.selectOptions?.head ? { ...state.selectOptions, head: false } : state.selectOptions } : {}),
        };
        let result = await executeNeon(queryForNeon);
        if (hasPostFilters && !result?.error) {
          let rows = applyPostFilters(Array.isArray(result.data) ? result.data : [], state.postFilters);
          const total = rows.length;
          if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1);
          else if (state.limit !== undefined) rows = rows.slice(0, Math.max(0, Number(state.limit) || 0));
          if (state.selectOptions?.head) {
            result = { ...result, data: null, count: state.selectOptions.count === "exact" ? total : result.count };
          } else if (state.single || state.maybeSingle) {
            if (state.single && rows.length !== 1) result = { ...result, data: null, error: { message: `Esperado 1 registro; encontrados ${rows.length}.`, code: "PGRST116" }, status: 406, statusText: "Not Acceptable" };
            else if (state.maybeSingle && rows.length > 1) result = { ...result, data: null, error: { message: `Esperado no maximo 1 registro; encontrados ${rows.length}.`, code: "PGRST116" }, status: 406, statusText: "Not Acceptable" };
            else result = { ...result, data: rows[0] || null };
          } else result = { ...result, data: rows };
        }
        if (throwOnError && result?.error) throw Object.assign(new Error(result.error.message || "Falha na operacao de banco."), result.error);
        return resolve(result);
      } catch (cause) {
        if (reject) return reject(cause);
        throw cause;
      }
    },
  };
  return builder;
}

export function createNeonSupabaseCompat(legacyTarget: SupabaseLike = {}): SupabaseLike {
  return new Proxy(legacyTarget || {}, {
    get(target, property, receiver) {
      if (property === "from") return (table: string) => createBuilder(legacyTarget, table);
      if (property === "rpc") return async (fn: string, args?: Record<string, unknown>) => executeNeonRpc(fn, args);
      return Reflect.get(target, property, receiver);
    },
  });
}
