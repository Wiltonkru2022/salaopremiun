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

type RelationSpec = {
  alias: string;
  table: string;
  columns: string[];
};

type ForeignKeyColumn = {
  source_column: string;
  target_column: string;
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SIMPLE_SELECT = /^[A-Za-z0-9_.*,:\s]+$/;

function quoteIdent(value: string) {
  if (!IDENT.test(value)) throw new Error(`Identificador SQL invalido: ${value}`);
  return `"${value}"`;
}

function splitTopLevel(value: string) {
  const result: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (depth !== 0) throw new Error("Select relacional invalido.");
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseSimpleColumn(part: string, tableAlias?: string) {
  const aliasMatch = part.match(/^([A-Za-z_][A-Za-z0-9_]*):([A-Za-z_][A-Za-z0-9_]*)$/);
  if (aliasMatch) {
    const [, alias, column] = aliasMatch;
    const prefix = tableAlias ? `${quoteIdent(tableAlias)}.` : "";
    return `${prefix}${quoteIdent(column)} AS ${quoteIdent(alias)}`;
  }
  if (part === "*") return tableAlias ? `${quoteIdent(tableAlias)}.*` : "*";
  if (!IDENT.test(part)) throw new Error(`Coluna invalida: ${part}`);
  const prefix = tableAlias ? `${quoteIdent(tableAlias)}.` : "";
  return `${prefix}${quoteIdent(part)}`;
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
      /^(?:(?<alias>[A-Za-z_][A-Za-z0-9_]*):)?(?<table>[A-Za-z_][A-Za-z0-9_]*)(?:![A-Za-z_][A-Za-z0-9_]*)?\s*\((?<columns>.*)\)$/s
    );
    if (relation?.groups) {
      const table = relation.groups.table;
      const alias = relation.groups.alias || table;
      const columns = splitTopLevel(relation.groups.columns || "*");
      if (!columns.length || columns.some((column) => column.includes("("))) {
        throw new Error("Relacao aninhada nao suportada no proxy Neon.");
      }
      columns.forEach((column) => {
        if (column !== "*" && !IDENT.test(column)) {
          throw new Error(`Coluna relacional invalida: ${column}`);
        }
      });
      relations.push({ alias, table, columns });
    } else {
      base.push(part);
    }
  }
  if (!base.length) base.push("*");
  return { base, relations };
}

function normalizeSimpleColumns(value?: string) {
  const parsed = parseSelect(value);
  if (parsed.relations.length) {
    throw new Error("RETURNING relacional nao suportado.");
  }
  return parsed.base.map((part) => parseSimpleColumn(part)).join(", ");
}

async function foreignKeyColumns(
  client: PoolClient,
  sourceTable: string,
  targetTable: string
) {
  const result = await client.query<ForeignKeyColumn>(
    `select source_att.attname as source_column,
            target_att.attname as target_column
       from pg_constraint c
       join lateral unnest(c.conkey) with ordinality source_key(attnum, ord) on true
       join lateral unnest(c.confkey) with ordinality target_key(attnum, ord)
         on target_key.ord = source_key.ord
       join pg_attribute source_att
         on source_att.attrelid = c.conrelid and source_att.attnum = source_key.attnum
       join pg_attribute target_att
         on target_att.attrelid = c.confrelid and target_att.attnum = target_key.attnum
      where c.contype = 'f'
        and c.conrelid = format('public.%I', $1)::regclass
        and c.confrelid = format('public.%I', $2)::regclass
      order by c.oid, source_key.ord`,
    [sourceTable, targetTable]
  );
  return result.rows;
}

function relationJsonExpression(alias: string, columns: string[]) {
  if (columns.length === 1 && columns[0] === "*") return `to_jsonb(${quoteIdent(alias)})`;
  const pairs = columns
    .map((column) => `'${column}', ${quoteIdent(alias)}.${quoteIdent(column)}`)
    .join(", ");
  return `jsonb_build_object(${pairs})`;
}

async function buildSelectClause(
  client: PoolClient,
  baseTable: string,
  value?: string
) {
  const parsed = parseSelect(value);
  const baseAlias = "base_row";
  const fields = parsed.base.map((part) => parseSimpleColumn(part, baseAlias));

  for (let index = 0; index < parsed.relations.length; index += 1) {
    const relation = parsed.relations[index];
    if (!IDENT.test(relation.table) || !IDENT.test(relation.alias)) {
      throw new Error("Relacao invalida.");
    }
    const relationAlias = `rel_${index}`;
    const forward = await foreignKeyColumns(client, baseTable, relation.table);

    if (forward.length) {
      const condition = forward
        .map(
          (fk) =>
            `${quoteIdent(relationAlias)}.${quoteIdent(fk.target_column)} = ${quoteIdent(baseAlias)}.${quoteIdent(fk.source_column)}`
        )
        .join(" AND ");
      fields.push(
        `(SELECT ${relationJsonExpression(relationAlias, relation.columns)} FROM public.${quoteIdent(relation.table)} ${quoteIdent(relationAlias)} WHERE ${condition} LIMIT 1) AS ${quoteIdent(relation.alias)}`
      );
      continue;
    }

    const reverse = await foreignKeyColumns(client, relation.table, baseTable);
    if (!reverse.length) {
      throw new Error(`Nao existe FK entre ${baseTable} e ${relation.table}.`);
    }
    const condition = reverse
      .map(
        (fk) =>
          `${quoteIdent(relationAlias)}.${quoteIdent(fk.source_column)} = ${quoteIdent(baseAlias)}.${quoteIdent(fk.target_column)}`
      )
      .join(" AND ");
    fields.push(
      `(SELECT COALESCE(jsonb_agg(${relationJsonExpression(relationAlias, relation.columns)}), '[]'::jsonb) FROM public.${quoteIdent(relation.table)} ${quoteIdent(relationAlias)} WHERE ${condition}) AS ${quoteIdent(relation.alias)}`
    );
  }

  return { clause: fields.join(", "), baseAlias };
}

function parseOrValue(raw: string) {
  const value = raw.trim();
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^"|"$/g, "");
}

function columnRef(column: string, tableAlias?: string) {
  const prefix = tableAlias ? `${quoteIdent(tableAlias)}.` : "";
  return `${prefix}${quoteIdent(column)}`;
}

function buildSimpleClause(
  op: string,
  column: string,
  value: unknown,
  values: unknown[],
  tableAlias?: string
) {
  const col = columnRef(column, tableAlias);
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

function buildOrClause(raw: unknown, values: unknown[], tableAlias?: string) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Filtro OR vazio.");
  const clauses = text.split(",").map((entry) => {
    const match = entry.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/);
    if (!match) throw new Error(`Filtro OR nao suportado: ${entry}`);
    const [, column, op, rawValue] = match;
    return buildSimpleClause(op, column, parseOrValue(rawValue), values, tableAlias);
  });
  return `(${clauses.join(" OR ")})`;
}

function buildWhere(
  filters: PainelDbFilter[],
  values: unknown[],
  tableAlias?: string
) {
  if (!filters.length) return "";
  const clauses = filters.map((filter) => {
    if (filter.op === "or") return buildOrClause(filter.value, values, tableAlias);
    if (!filter.column) throw new Error("Filtro sem coluna.");
    return buildSimpleClause(filter.op, filter.column, filter.value, values, tableAlias);
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
    (row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object" && !Array.isArray(row))
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

  if (!query.mutation) {
    const baseAlias = "base_row";
    const where = buildWhere(filters, values, baseAlias);
    if (query.selectOptions?.head && query.selectOptions?.count === "exact") {
      const result = await client.query(
        `SELECT count(*)::int AS count FROM ${table} ${quoteIdent(baseAlias)}${where}`,
        values
      );
      return {
        data: null,
        error: null,
        count: Number(result.rows[0]?.count || 0),
        status: 200,
        statusText: "OK",
      };
    }

    const selection = await buildSelectClause(client, query.table, query.select);
    let text = `SELECT ${selection.clause} FROM ${table} ${quoteIdent(baseAlias)}${where}`;
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
            return `${columnRef(order.column, baseAlias)} ${direction}${nulls}`;
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
          error: {
            message: `Esperado 1 registro; encontrados ${result.rows.length}.`,
            code: "PGRST116",
          },
          count: null,
          status: 406,
          statusText: "Not Acceptable",
        };
      }
      if (query.maybeSingle && result.rows.length > 1) {
        return {
          data: null,
          error: {
            message: `Esperado no maximo 1 registro; encontrados ${result.rows.length}.`,
            code: "PGRST116",
          },
          count: null,
          status: 406,
          statusText: "Not Acceptable",
        };
      }
      data = result.rows[0] || null;
    }
    return { data, error: null, count: null, status: 200, statusText: "OK" };
  }

  const selectColumns = normalizeSimpleColumns(query.select);
  const returning = query.select ? ` RETURNING ${selectColumns}` : "";
  let text = "";

  if (query.mutation.kind === "insert" || query.mutation.kind === "upsert") {
    const rows = normalizeMutationRows(query.mutation.payload);
    if (!rows.length) {
      return { data: [], error: null, count: null, status: 201, statusText: "Created" };
    }
    const keys = Object.keys(rows[0]);
    if (!keys.length || keys.some((key) => !IDENT.test(key))) {
      throw new Error("Payload insert invalido.");
    }
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
      const conflictColumns = configured.length
        ? configured
        : await primaryKeyColumns(client, query.table);
      if (!conflictColumns.length || conflictColumns.some((column) => !IDENT.test(column))) {
        throw new Error("Nao foi possivel identificar a chave de conflito do upsert.");
      }
      if (query.mutation.options?.ignoreDuplicates) {
        text += ` ON CONFLICT (${conflictColumns.map(quoteIdent).join(", ")}) DO NOTHING`;
      } else {
        const updateKeys = keys.filter((key) => !conflictColumns.includes(key));
        text += ` ON CONFLICT (${conflictColumns.map(quoteIdent).join(", ")}) DO ${
          updateKeys.length
            ? `UPDATE SET ${updateKeys
                .map((key) => `${quoteIdent(key)} = EXCLUDED.${quoteIdent(key)}`)
                .join(", ")}`
            : "NOTHING"
        }`;
      }
    }
    text += returning;
  } else if (query.mutation.kind === "update") {
    const payload = query.mutation.payload as Record<string, unknown>;
    const keys = Object.keys(payload || {});
    if (!keys.length || keys.some((key) => !IDENT.test(key))) {
      throw new Error("Payload update invalido.");
    }
    const set = keys.map((key) => {
      values.push(payload[key]);
      return `${quoteIdent(key)} = $${values.length}`;
    });
    const updateWhere = buildWhere(filters, values);
    text = `UPDATE ${table} SET ${set.join(", ")}${updateWhere}${returning}`;
  } else {
    const deleteWhere = buildWhere(filters, values);
    text = `DELETE FROM ${table}${deleteWhere}${returning}`;
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

export async function executePainelNeonRpc(
  client: PoolClient,
  request: PainelDbRpc
) {
  if (!IDENT.test(request.fn)) throw new Error("RPC invalida.");
  const args = request.args || {};
  const entries = Object.entries(args);
  if (entries.some(([key]) => !IDENT.test(key))) {
    throw new Error("Parametro RPC invalido.");
  }
  const values: unknown[] = [];
  const named = entries.map(([key, value]) => {
    values.push(value);
    return `${quoteIdent(key)} => $${values.length}`;
  });
  const fn = `public.${quoteIdent(request.fn)}`;
  const result = await client.query(
    `SELECT * FROM ${fn}(${named.join(", ")})`,
    values
  );

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
