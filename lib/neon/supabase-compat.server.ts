import { Pool } from "@neondatabase/serverless";

type SupabaseLike = any;
type Filter = { op: string; column: string; value?: unknown };
type Order = { column: string; ascending: boolean; nullsFirst?: boolean };
type Mutation =
  | { kind: "insert"; payload: unknown }
  | { kind: "update"; payload: unknown }
  | { kind: "delete" }
  | { kind: "upsert"; payload: unknown; options?: Record<string, unknown> };

type State = {
  table: string;
  select?: string;
  selectOptions?: { count?: string; head?: boolean };
  mutation?: Mutation;
  filters: Filter[];
  orders: Order[];
  limit?: number;
  range?: [number, number];
  single?: boolean;
  maybeSingle?: boolean;
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SIMPLE_SELECT = /^[A-Za-z0-9_.*,\s]+$/;

let adminPool: Pool | null = null;
let adminPoolUrl = "";

function getAdminPool() {
  const url = String(process.env.NEON_ADMIN_DATABASE_URL || "").trim();
  if (!url) throw new Error("NEON_ADMIN_DATABASE_URL nao configurada.");
  if (!adminPool || adminPoolUrl !== url) {
    adminPool = new Pool({ connectionString: url });
    adminPoolUrl = url;
  }
  return adminPool;
}

function quoteIdent(value: string) {
  if (!IDENT.test(value)) throw new Error(`Identificador SQL invalido: ${value}`);
  return `"${value}"`;
}

function normalizeColumns(value?: string) {
  const raw = String(value || "*").trim();
  if (!SIMPLE_SELECT.test(raw) || raw.includes("(")) return null;
  if (raw === "*") return "*";
  const parts = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (!parts.length) return "*";
  return parts.map((part) => {
    if (part === "*") return "*";
    if (part.includes(".")) {
      return part.split(".").map(quoteIdent).join(".");
    }
    return quoteIdent(part);
  }).join(", ");
}

function isSupportedState(state: State) {
  if (!IDENT.test(state.table)) return false;
  if (state.select && normalizeColumns(state.select) === null) return false;
  if (state.mutation?.kind === "upsert") return false;
  return state.filters.every((filter) => IDENT.test(filter.column));
}

function buildWhere(filters: Filter[], values: unknown[]) {
  if (!filters.length) return "";
  const clauses = filters.map((filter) => {
    const col = quoteIdent(filter.column);
    switch (filter.op) {
      case "eq": values.push(filter.value); return `${col} = $${values.length}`;
      case "neq": values.push(filter.value); return `${col} <> $${values.length}`;
      case "gt": values.push(filter.value); return `${col} > $${values.length}`;
      case "gte": values.push(filter.value); return `${col} >= $${values.length}`;
      case "lt": values.push(filter.value); return `${col} < $${values.length}`;
      case "lte": values.push(filter.value); return `${col} <= $${values.length}`;
      case "like": values.push(filter.value); return `${col} LIKE $${values.length}`;
      case "ilike": values.push(filter.value); return `${col} ILIKE $${values.length}`;
      case "is": {
        if (filter.value === null) return `${col} IS NULL`;
        if (filter.value === true) return `${col} IS TRUE`;
        if (filter.value === false) return `${col} IS FALSE`;
        return `${col} IS ${String(filter.value).toUpperCase()}`;
      }
      case "in": {
        const array = Array.isArray(filter.value) ? filter.value : [];
        if (!array.length) return "FALSE";
        const placeholders = array.map((value) => {
          values.push(value);
          return `$${values.length}`;
        });
        return `${col} IN (${placeholders.join(", ")})`;
      }
      default:
        throw new Error(`Filtro Neon nao suportado: ${filter.op}`);
    }
  });
  return ` WHERE ${clauses.join(" AND ")}`;
}

function returningClause(state: State) {
  const columns = normalizeColumns(state.select);
  return state.select ? ` RETURNING ${columns || "*"}` : "";
}

async function executeNeon(state: State) {
  const pool = getAdminPool();
  const values: unknown[] = [];
  const table = `public.${quoteIdent(state.table)}`;
  const where = buildWhere(state.filters, values);
  let text = "";
  let count: number | null = null;

  if (!state.mutation) {
    if (state.selectOptions?.head && state.selectOptions?.count === "exact") {
      text = `SELECT count(*)::int AS count FROM ${table}${where}`;
      const result = await pool.query(text, values);
      count = Number(result.rows?.[0]?.count || 0);
      return { data: null, error: null, count, status: 200, statusText: "OK" };
    }

    const columns = normalizeColumns(state.select) || "*";
    text = `SELECT ${columns} FROM ${table}${where}`;
    if (state.orders.length) {
      text += " ORDER BY " + state.orders.map((order) => {
        const direction = order.ascending ? "ASC" : "DESC";
        const nulls = order.nullsFirst === undefined ? "" : order.nullsFirst ? " NULLS FIRST" : " NULLS LAST";
        return `${quoteIdent(order.column)} ${direction}${nulls}`;
      }).join(", ");
    }
    if (state.range) {
      const [from, to] = state.range;
      text += ` LIMIT ${Math.max(0, to - from + 1)} OFFSET ${Math.max(0, from)}`;
    } else if (state.limit !== undefined) {
      text += ` LIMIT ${Math.max(0, state.limit)}`;
    }
    const result = await pool.query(text, values);
    let data: any = result.rows;
    if (state.single || state.maybeSingle) {
      if (state.single && result.rows.length !== 1) {
        return { data: null, error: { message: `Esperado 1 registro; encontrados ${result.rows.length}.`, code: "PGRST116" }, count: null, status: 406, statusText: "Not Acceptable" };
      }
      if (state.maybeSingle && result.rows.length > 1) {
        return { data: null, error: { message: `Esperado no maximo 1 registro; encontrados ${result.rows.length}.`, code: "PGRST116" }, count: null, status: 406, statusText: "Not Acceptable" };
      }
      data = result.rows[0] || null;
    }
    return { data, error: null, count, status: 200, statusText: "OK" };
  }

  if (state.mutation.kind === "insert") {
    const rows = Array.isArray(state.mutation.payload) ? state.mutation.payload : [state.mutation.payload];
    if (!rows.length) return { data: [], error: null, count: null, status: 201, statusText: "Created" };
    const objects = rows as Record<string, unknown>[];
    const keys = Object.keys(objects[0] || {});
    if (!keys.length || keys.some((key) => !IDENT.test(key))) throw new Error("Payload insert invalido.");
    const tuples = objects.map((row) => `(${keys.map((key) => { values.push(row[key]); return `$${values.length}`; }).join(", ")})`);
    text = `INSERT INTO ${table} (${keys.map(quoteIdent).join(", ")}) VALUES ${tuples.join(", ")}${returningClause(state)}`;
  } else if (state.mutation.kind === "update") {
    const payload = state.mutation.payload as Record<string, unknown>;
    const keys = Object.keys(payload || {});
    if (!keys.length || keys.some((key) => !IDENT.test(key))) throw new Error("Payload update invalido.");
    const set = keys.map((key) => { values.push(payload[key]); return `${quoteIdent(key)} = $${values.length}`; });
    const updateWhere = buildWhere(state.filters, values);
    text = `UPDATE ${table} SET ${set.join(", ")}${updateWhere}${returningClause(state)}`;
  } else if (state.mutation.kind === "delete") {
    text = `DELETE FROM ${table}${where}${returningClause(state)}`;
  } else {
    throw new Error("Upsert deve usar fallback Supabase durante a transicao.");
  }

  const result = await pool.query(text, values);
  let data: any = state.select ? result.rows : null;
  if (state.single || state.maybeSingle) data = result.rows?.[0] || null;
  return { data, error: null, count: null, status: 200, statusText: "OK" };
}

function applyFallback(supabase: SupabaseLike, state: State) {
  let query: any = supabase.from(state.table);
  if (state.mutation?.kind === "insert") query = query.insert(state.mutation.payload);
  else if (state.mutation?.kind === "update") query = query.update(state.mutation.payload);
  else if (state.mutation?.kind === "delete") query = query.delete();
  else if (state.mutation?.kind === "upsert") query = query.upsert(state.mutation.payload, state.mutation.options);

  if (state.select) query = query.select(state.select, state.selectOptions);
  for (const filter of state.filters) query = query[filter.op](filter.column, filter.value);
  for (const order of state.orders) query = query.order(order.column, { ascending: order.ascending, nullsFirst: order.nullsFirst });
  if (state.range) query = query.range(state.range[0], state.range[1]);
  else if (state.limit !== undefined) query = query.limit(state.limit);
  if (state.single) query = query.single();
  else if (state.maybeSingle) query = query.maybeSingle();
  return query;
}

function createBuilder(supabase: SupabaseLike, table: string) {
  const state: State = { table, filters: [], orders: [] };
  const builder: any = {
    select(columns = "*", options?: { count?: string; head?: boolean }) { state.select = columns; state.selectOptions = options; return builder; },
    insert(payload: unknown) { state.mutation = { kind: "insert", payload }; return builder; },
    update(payload: unknown) { state.mutation = { kind: "update", payload }; return builder; },
    delete() { state.mutation = { kind: "delete" }; return builder; },
    upsert(payload: unknown, options?: Record<string, unknown>) { state.mutation = { kind: "upsert", payload, options }; return builder; },
    eq(column: string, value: unknown) { state.filters.push({ op: "eq", column, value }); return builder; },
    neq(column: string, value: unknown) { state.filters.push({ op: "neq", column, value }); return builder; },
    gt(column: string, value: unknown) { state.filters.push({ op: "gt", column, value }); return builder; },
    gte(column: string, value: unknown) { state.filters.push({ op: "gte", column, value }); return builder; },
    lt(column: string, value: unknown) { state.filters.push({ op: "lt", column, value }); return builder; },
    lte(column: string, value: unknown) { state.filters.push({ op: "lte", column, value }); return builder; },
    like(column: string, value: unknown) { state.filters.push({ op: "like", column, value }); return builder; },
    ilike(column: string, value: unknown) { state.filters.push({ op: "ilike", column, value }); return builder; },
    is(column: string, value: unknown) { state.filters.push({ op: "is", column, value }); return builder; },
    in(column: string, value: unknown[]) { state.filters.push({ op: "in", column, value }); return builder; },
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { state.orders.push({ column, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst }); return builder; },
    limit(value: number) { state.limit = value; return builder; },
    range(from: number, to: number) { state.range = [from, to]; return builder; },
    single() { state.single = true; return builder; },
    maybeSingle() { state.maybeSingle = true; return builder; },
    async then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
      try {
        const useNeon = String(process.env.DATABASE_PROVIDER || "supabase").toLowerCase() === "neon" && Boolean(process.env.NEON_ADMIN_DATABASE_URL);
        const result = useNeon && isSupportedState(state)
          ? await executeNeon(state)
          : await applyFallback(supabase, state);
        return resolve(result);
      } catch {
        // Falha Neon nunca derruba a producao durante a janela de migracao.
        try {
          const fallback = await applyFallback(supabase, state);
          return resolve(fallback);
        } catch (fallbackError) {
          if (reject) return reject(fallbackError);
          throw fallbackError;
        }
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
      // RPC, Auth, Storage, Functions e Realtime continuam no Supabase ate suas
      // respectivas migracoes terem compatibilidade equivalente e testada.
      return Reflect.get(target, property, receiver);
    },
  });
}
