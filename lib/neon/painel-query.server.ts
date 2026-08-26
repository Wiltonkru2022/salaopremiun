import type { PoolClient } from "@neondatabase/serverless";

export type PainelDbFilter = {
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in" | "contains" | "not" | "or";
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
  | { kind: "delete"; options?: { count?: string } }
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

type RelationSpec = {
  alias: string;
  table: string;
  columns: string[];
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COLUMN_PATH = /^([A-Za-z_][A-Za-z0-9_]*)(?:->>([A-Za-z_][A-Za-z0-9_]*))?$/;
const SIMPLE_SELECT = /^[A-Za-z0-9_.*,\s:!()]+$/;

function quoteIdent(value: string) {
  if (!IDENT.test(value)) throw new Error(`Identificador SQL invalido: ${value}`);
  return `"${value}"`;
}

function renderColumn(value: string, prefix = "") {
  const match = value.match(COLUMN_PATH);
  if (!match) throw new Error(`Coluna SQL invalida: ${value}`);
  const base = `${prefix}${quoteIdent(match[1])}`;
  return match[2] ? `${base}->>'${match[2]}'` : base;
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) throw new Error("Select relacional invalido.");
  }
  if (depth !== 0) throw new Error("Select relacional invalido.");
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function parseSelect(value?: string) {
  const raw = String(value || "*").trim();
  if (!raw) return { base: ["*"], relations: [] as RelationSpec[] };
  if (!SIMPLE_SELECT.test(raw.replace(/[()!]/g, ""))) {
    throw new Error("Select contem caracteres nao suportados.");
  }

  const base: string[] = [];
  const relations: RelationSpec[] = [];
  for (const part of splitTopLevel(raw)) {
    const relation = part.match(
      /^(?:([A-Za-z_][A-Za-z0-9_]*):)?([A-Za-z_][A-Za-z0-9_]*)(?:![A-Za-z_][A-Za-z0-9_]*)?\s*\(([\s\S]*)\)$/
    );
    if (relation) {
      const table = relation[2];
      const alias = relation[1] || table;
      const columns = splitTopLevel(relation[3] || "*");
      if (!columns.length || columns.some((column) => column.includes("("))) {
        throw new Error("Relacao aninhada nao suportada no proxy Neon.");
      }
      columns.forEach((column) => {
        if (column !== "*" && !IDENT.test(column)) {
          throw new Error(`Coluna relacional invalida: ${column}`);
        }
      });
      relations.push({ alias, table, columns });
      continue;
    }
    if (part !== "*" && !IDENT.test(part)) {
      throw new Error(`Coluna invalida: ${part}`);
    }
    base.push(part);
  }
  if (!base.length) base.push("*");
  return { base, relations };
}

function renderBaseColumns(columns: string[], tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  if (columns.includes("*")) return `${prefix}*`;
  return columns.map((column) => `${prefix}${quoteIdent(column)}`).join(", ");
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
  values: unknown[],
  prefix = ""
) {
  const col = renderColumn(column, prefix);
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
    case "contains":
      values.push(value);
      return `${col} @> $${values.length}`;
    case "is":
      if (value === null) return `${col} IS NULL`;
      if (value === true) return `${col} IS TRUE`;
      if (value === false) return `${col} IS FALSE`;
      throw new Error("Filtro IS invalido.");
    case "not": {
      const input = value as { operator?: string; value?: unknown };
      if (input.operator === "is" && input.value === null) return `${col} IS NOT NULL`;
      if (input.operator === "eq") {
        values.push(input.value);
        return `${col} <> $${values.length}`;
      }
      throw new Error("Filtro NOT invalido.");
    }
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

function buildOrEntry(entry: string, values: unknown[], prefix: string) {
  const match = entry.trim().match(
    /^([A-Za-z_][A-Za-z0-9_]*(?:->>[A-Za-z_][A-Za-z0-9_]*)?)\.(eq|neq|gt|gte|lt|lte|like|ilike|is|not\.is|not\.eq)\.(.+)$/
  );
  if (!match) throw new Error(`Filtro OR nao suportado: ${entry}`);
  const [, column, op, rawValue] = match;
  if (op.startsWith("not.")) {
    return buildSimpleClause(
      "not",
      column,
      { operator: op.slice(4), value: parseOrValue(rawValue) },
      values,
      prefix
    );
  }
  return buildSimpleClause(op, column, parseOrValue(rawValue), values, prefix);
}

function buildOrClause(raw: unknown, values: unknown[], prefix = "") {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Filtro OR vazio.");
  const clauses = splitTopLevel(text).map((entry) => {
    const grouped = entry.match(/^and\(([\s\S]*)\)$/);
    if (!grouped) return buildOrEntry(entry, values, prefix);
    const andClauses = splitTopLevel(grouped[1]).map((item) =>
      buildOrEntry(item, values, prefix)
    );
    if (!andClauses.length) throw new Error("Grupo AND vazio no filtro OR.");
    return `(${andClauses.join(" AND ")})`;
  });
  return `(${clauses.join(" OR ")})`;
}

function buildWhere(filters: PainelDbFilter[], values: unknown[], prefix = "") {
  if (!filters.length) return "";
  const clauses = filters.map((filter) => {
    if (filter.op === "or") return buildOrClause(filter.value, values, prefix);
    if (!filter.column) throw new Error("Filtro sem coluna.");
    return buildSimpleClause(filter.op, filter.column, filter.value, values, prefix);
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

async function findRelation(client: PoolClient, sourceTable: string, relationTable: string) {
  const result = await client.query<{
    source_column: string;
    relation_column: string;
    direction: string;
  }>(
    `select source_column, relation_column, direction
       from (
         select a_src.attname as source_column,
                a_rel.attname as relation_column,
                'forward'::text as direction
           from pg_constraint c
           join pg_class src on src.oid = c.conrelid
           join pg_namespace nsrc on nsrc.oid = src.relnamespace
           join pg_class rel on rel.oid = c.confrelid
           join pg_attribute a_src on a_src.attrelid = c.conrelid and a_src.attnum = c.conkey[1]
           join pg_attribute a_rel on a_rel.attrelid = c.confrelid and a_rel.attnum = c.confkey[1]
          where c.contype = 'f' and nsrc.nspname = 'public'
            and src.relname = $1 and rel.relname = $2
         union all
         select a_src.attname as source_column,
                a_rel.attname as relation_column,
                'reverse'::text as direction
           from pg_constraint c
           join pg_class rel on rel.oid = c.conrelid
           join pg_namespace nrel on nrel.oid = rel.relnamespace
           join pg_class src on src.oid = c.confrelid
           join pg_attribute a_rel on a_rel.attrelid = c.conrelid and a_rel.attnum = c.conkey[1]
           join pg_attribute a_src on a_src.attrelid = c.confrelid and a_src.attnum = c.confkey[1]
          where c.contype = 'f' and nrel.nspname = 'public'
            and src.relname = $1 and rel.relname = $2
       ) relations
      limit 1`,
    [sourceTable, relationTable]
  );
  return result.rows[0] || null;
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
  const parsedSelect = parseSelect(query.select);
  const hasRelations = parsedSelect.relations.length > 0;
  const where = buildWhere(filters, values, hasRelations ? "src." : "");

  if (!query.mutation) {
    if (query.selectOptions?.head && query.selectOptions?.count === "exact") {
      const result = await client.query(`SELECT count(*)::int AS count FROM ${table}${where}`, values);
      return { data: null, error: null, count: Number(result.rows[0]?.count || 0), status: 200, statusText: "OK" };
    }

    let exactCount: number | null = null;
    if (query.selectOptions?.count === "exact") {
      const countResult = await client.query(
        `SELECT count(*)::int AS count FROM ${table}${hasRelations ? " src" : ""}${where}`,
        values
      );
      exactCount = Number(countResult.rows[0]?.count || 0);
    }

    let selectSql = renderBaseColumns(parsedSelect.base, hasRelations ? "src" : "");
    if (hasRelations) {
      const relationSelects: string[] = [];
      for (const relation of parsedSelect.relations) {
        const link = await findRelation(client, query.table, relation.table);
        if (!link) throw new Error(`Relacao ${query.table} -> ${relation.table} nao encontrada.`);
        const relationColumns = relation.columns.includes("*")
          ? "r.*"
          : relation.columns.map((column) => `r.${quoteIdent(column)}`).join(", ");
        const condition =
          link.direction === "forward"
            ? `r.${quoteIdent(link.relation_column)} = src.${quoteIdent(link.source_column)}`
            : `r.${quoteIdent(link.relation_column)} = src.${quoteIdent(link.source_column)}`;
        relationSelects.push(
          `(SELECT to_jsonb(rel_row) FROM (SELECT ${relationColumns} FROM public.${quoteIdent(
            relation.table
          )} r WHERE ${condition} LIMIT 1) rel_row) AS ${quoteIdent(relation.alias)}`
        );
      }
      selectSql += `, ${relationSelects.join(", ")}`;
    }

    let text = `SELECT ${selectSql} FROM ${table}${hasRelations ? " src" : ""}${where}`;
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
            return `${hasRelations ? "src." : ""}${quoteIdent(order.column)} ${direction}${nulls}`;
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
    return { data, error: null, count: exactCount, status: 200, statusText: "OK" };
  }

  const selectColumns = parsedSelect.base.includes("*")
    ? "*"
    : parsedSelect.base.map(quoteIdent).join(", ");
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
    text = `DELETE FROM ${table}${buildWhere(filters, values)}${returning}`;
  }

  const result = await client.query(text, values);
  let data: unknown = query.select ? result.rows : null;
  if (query.single || query.maybeSingle) data = result.rows[0] || null;
  return {
    data,
    error: null,
    count:
      query.mutation.kind === "delete" &&
      query.mutation.options?.count === "exact"
        ? result.rowCount
        : null,
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
