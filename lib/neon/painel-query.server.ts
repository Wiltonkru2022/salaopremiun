import "server-only";
import type { PoolClient } from "@neondatabase/serverless";

export type PainelDbFilter = {
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in" | "or";
  column?: string;
  value?: unknown;
};

export type PainelDbOrder = {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
};

export type PainelDbMutation =
  | { kind: "insert"; payload: unknown }
  | { kind: "update"; payload: unknown }
  | { kind: "delete" }
  | {
      kind: "upsert";
      payload: unknown;
      options?: { onConflict?: string; ignoreDuplicates?: boolean };
    };

export type PainelDbQuery = {
  kind?: "query";
  table: string;
  select?: string;
  selectOptions?: { count?: string; head?: boolean };
  mutation?: PainelDbMutation;
  filters?: PainelDbFilter[];
  orders?: PainelDbOrder[];
  limit?: number;
  range?: [number, number];
  single?: boolean;
  maybeSingle?: boolean;
};

export type PainelDbRpc = {
  kind: "rpc";
  fn: string;
  args?: Record<string, unknown>;
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SIMPLE_SELECT = /^[A-Za-z0-9_.*,\s]+$/;

function quoteIdent(value: string) {
  if (!IDENT.test(value)) throw new Error(`Identificador SQL invalido: ${value}`);
  return `"${value}"`;
}

function normalizeColumns(value?: string) {
  const raw = String(value || "*").trim();
  if (!SIMPLE_SELECT.test(raw) || raw.includes("(")) {
    throw new Error("Select relacional nao suportado no proxy Neon do painel.");
  }
  if (raw === "*") return "*";
  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts
    .map((part) => {
      if (part === "*") return "*";
      return part.split(".").map(quoteIdent).join(".");
    })
    .join(", ");
}

function parseOrValue(raw: string) {
  const value = raw.trim();
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^"|"$/g, "");
}

function buildSimpleClause(
  op: string,
  column: string,
  value: unknown,
  values: unknown[]
) {
  const col = quoteIdent(column);
  switch (op) {
    case "eq":
      values.push(value);
      return `${col} = $${values.length}`;
    case "neq":
      values.push(value);
      return `${col} <> $${values.length}`;
    case "gt":
      values.push(value);
      return `${col} > $${values.length}`;
    case "gte":
      values.push(value);
      return `${col} >= $${values.length}`;
    case "lt":
      values.push(value);
      return `${col} < $${values.length}`;
    case "lte":
      values.push(value);
      return `${col} <= $${values.length}`;
    case "like":
      values.push(value);
      return `${col} LIKE $${values.length}`;
    case "ilike":
      values.push(value);
      return `${col} ILIKE $${values.length}`;
    case "is":
      if (value === null) return `${col} IS NULL`;
      if (value === true) return `${col} IS TRUE`;
      if (value === false) return `${col} IS FALSE`;
      throw new Error("Filtro IS invalido.");
    case "in": {
      const list = Array.isArray(value) ? value : [];
      if (!list.length) return "FALSE";
      const placeholders = list.map((item) => {
        values.push(item);
        return `$${values.length}`;
      });
      return `${col} IN (${placeholders.join(", ")})`;
    }
    default:
      throw new Error(`Filtro nao suportado: ${op}`);
  }
}

function buildOrClause(raw: unknown, values: unknown[]) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Filtro OR vazio.");
  const clauses = text.split(",").map((entry) => {
    const match = entry.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/);
    if (!match) throw new Error(`Filtro OR nao suportado: ${entry}`);
    const [, column, op, rawValue] = match;
    return buildSimpleClause(op, column, parseOrValue(rawValue), values);
  });
  return `(${clauses.join(" OR ")})`;
}

function buildWhere(filters: PainelDbFilter[], values: unknown[]) {
  if (!filters.length) return "";
  const clauses = filters.map((filter) => {
    if (filter.op === "or") return buildOrClause(filter.value, values);
    if (!filter.column) throw new Error("Filtro sem coluna.");
    return buildSimpleClause(filter.op, filter.column, filter.value, values);
  });
  return ` WHERE ${clauses.join(" AND ")}`;
}

async function primaryKeyColumns(client: PoolClient, table: string) {
  const result = await client.query<{ column_name: string }>(
    `select a.attname as column_name
       from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = format('public.%I', $1)::regclass
        and i.indisprimary
      order by array_position(i.indkey, a.attnum)`,
    [table]
  );
  return result.rows.map((row) => row.column_name);
}

function normalizeMutationRows(payload: unknown) {
  const rows = Array.isArray(payload) ? payload : [payload];
  const objects = rows.filter(
    (row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row))
  );
  if (objects.length !== rows.length) throw new Error("Payload de mutacao invalido.");
  return objects;
}

export async function executePainelNeonQuery(
  client: PoolClient,
  query: PainelDbQuery
) {
  if (!IDENT.test(query.table)) throw new Error("Tabela invalida.");
  const filters = query.filters || [];
  const orders = query.orders || [];
  const values: unknown[] = [];
  const table = `public.${quoteIdent(query.table)}`;
  const where = buildWhere(filters, values);
  const selectColumns = normalizeColumns(query.select);

  if (!query.mutation) {
    if (query.selectOptions?.head && query.selectOptions?.count === "exact") {
      const result = await client.query(`SELECT count(*)::int AS count FROM ${table}${where}`, values);
      return { data: null, error: null, count: Number(result.rows[0]?.count || 0), status: 200, statusText: "OK" };
    }

    let text = `SELECT ${selectColumns} FROM ${table}${where}`;
    if (orders.length) {
      text +=
        " ORDER BY " +
        orders
          .map((order) => {
            const direction = order.ascending === false ? "DESC" : "ASC";
            const nulls =
              order.nullsFirst === undefined
                ? ""
                : order.nullsFirst
                  ? " NULLS FIRST"
                  : " NULLS LAST";
            return `${quoteIdent(order.column)} ${direction}${nulls}`;
          })
          .join(", ");
    }
    if (query.range) {
      const [from, to] = query.range;
      text += ` LIMIT ${Math.max(0, to - from + 1)} OFFSET ${Math.max(0, from)}`;
    } else if (query.limit !== undefined) {
      text += ` LIMIT ${Math.max(0, Number(query.limit) || 0)}`;
    }

    const result = await client.query(text, values);
    let data: unknown = result.rows;
    if (query.single || query.maybeSingle) {
      if (query.single && result.rows.length !== 1) {
        return {
          data: null,
          error: { message: `Esperado 1 registro; encontrados ${result.rows.length}.`, code: "PGRST116" },
          count: null,
          status: 406,
          statusText: "Not Acceptable",
        };
      }
      if (query.maybeSingle && result.rows.length > 1) {
        return {
          data: null,
          error: { message: `Esperado no maximo 1 registro; encontrados ${result.rows.length}.`, code: "PGRST116" },
          count: null,
          status: 406,
          statusText: "Not Acceptable",
        };
      }
      data = result.rows[0] || null;
    }
    return { data, error: null, count: null, status: 200, statusText: "OK" };
  }

  const returning = query.select ? ` RETURNING ${selectColumns}` : "";
  let text = "";

  if (query.mutation.kind === "insert" || query.mutation.kind === "upsert") {
    const rows = normalizeMutationRows(query.mutation.payload);
    if (!rows.length) {
      return { data: [], error: null, count: null, status: 201, statusText: "Created" };
    }
    const keys = Object.keys(rows[0]);
    if (!keys.length || keys.some((key) => !IDENT.test(key))) throw new Error("Payload insert invalido.");
    if (rows.some((row) => keys.some((key) => !(key in row)))) {
      throw new Error("Linhas de insert possuem colunas diferentes.");
    }
    const tuples = rows.map(
      (row) =>
        `(${keys
          .map((key) => {
            values.push(row[key]);
            return `$${values.length}`;
          })
          .join(", ")})`
    );
    text = `INSERT INTO ${table} (${keys.map(quoteIdent).join(", ")}) VALUES ${tuples.join(", ")}`;

    if (query.mutation.kind === "upsert") {
      const configured = String(query.mutation.options?.onConflict || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const conflictColumns = configured.length ? configured : await primaryKeyColumns(client, query.table);
      if (!conflictColumns.length || conflictColumns.some((column) => !IDENT.test(column))) {
        throw new Error("Nao foi possivel identificar a chave de conflito do upsert.");
      }
      if (query.mutation.options?.ignoreDuplicates) {
        text += ` ON CONFLICT (${conflictColumns.map(quoteIdent).join(", ")}) DO NOTHING`;
      } else {
        const updateKeys = keys.filter((key) => !conflictColumns.includes(key));
        text += ` ON CONFLICT (${conflictColumns.map(quoteIdent).join(", ")}) DO ${
          updateKeys.length
            ? `UPDATE SET ${updateKeys.map((key) => `${quoteIdent(key)} = EXCLUDED.${quoteIdent(key)}`).join(", ")}`
            : "NOTHING"
        }`;
      }
    }
    text += returning;
  } else if (query.mutation.kind === "update") {
    const payload = query.mutation.payload as Record<string, unknown>;
    const keys = Object.keys(payload || {});
    if (!keys.length || keys.some((key) => !IDENT.test(key))) throw new Error("Payload update invalido.");
    const set = keys.map((key) => {
      values.push(payload[key]);
      return `${quoteIdent(key)} = $${values.length}`;
    });
    const updateWhere = buildWhere(filters, values);
    text = `UPDATE ${table} SET ${set.join(", ")}${updateWhere}${returning}`;
  } else {
    text = `DELETE FROM ${table}${where}${returning}`;
  }

  const result = await client.query(text, values);
  let data: unknown = query.select ? result.rows : null;
  if (query.single || query.maybeSingle) data = result.rows[0] || null;
  return {
    data,
    error: null,
    count: null,
    status: query.mutation.kind === "insert" ? 201 : 200,
    statusText: "OK",
  };
}

export async function executePainelNeonRpc(client: PoolClient, request: PainelDbRpc) {
  if (!IDENT.test(request.fn)) throw new Error("RPC invalida.");
  const args = request.args || {};
  const entries = Object.entries(args);
  if (entries.some(([key]) => !IDENT.test(key))) throw new Error("Parametro RPC invalido.");
  const values: unknown[] = [];
  const named = entries.map(([key, value]) => {
    values.push(value);
    return `${quoteIdent(key)} => $${values.length}`;
  });
  const fn = `public.${quoteIdent(request.fn)}`;
  const result = await client.query(`SELECT * FROM ${fn}(${named.join(", ")})`, values);

  let data: unknown = result.rows;
  if (result.rows.length === 1) {
    const row = result.rows[0] as Record<string, unknown>;
    const keys = Object.keys(row);
    if (keys.length === 1 && (keys[0] === request.fn || keys[0] === "result")) {
      data = row[keys[0]];
    }
  }
  return { data, error: null, count: null, status: 200, statusText: "OK" };
}
