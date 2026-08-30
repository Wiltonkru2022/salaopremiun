import { describe, expect, it, vi } from "vitest";
import {
  executePainelNeonQuery,
  executePainelNeonRpc,
  type PainelDbQuery,
} from "@/lib/neon/painel-query.server";

function databaseClient(rows: Array<Record<string, unknown>> = []) {
  const query = vi.fn(async (text: string) => ({
    rows,
    rowCount: rows.length,
    command: text.trimStart().split(/\s+/, 1)[0],
    oid: 0,
    fields: [],
  }));
  return { client: { query } as any, query };
}

function scriptedClient(handler: (sql: string, values?: unknown[]) => any) {
  return {
    query: vi.fn(async (sql: string, values?: unknown[]) => handler(sql, values)),
  } as any;
}

describe("executePainelNeonQuery", () => {
  it("traduz grupos AND dentro de um filtro OR", async () => {
    const { client, query } = databaseClient();

    await executePainelNeonQuery(client, {
      table: "comandas",
      select: "id",
      filters: [
        {
          op: "or",
          value:
            "and(status.eq.fechada,fechada_em.gte.2026-08-01),and(status.eq.cancelada,cancelada_em.lte.2026-08-31)",
        },
      ],
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        '("status" = $1 AND "fechada_em" >= $2) OR ("status" = $3 AND "cancelada_em" <= $4)'
      ),
      ["fechada", "2026-08-01", "cancelada", "2026-08-31"]
    );
  });

  it("suporta caminho JSON e not.is nos filtros OR", async () => {
    const { client, query } = databaseClient();

    await executePainelNeonQuery(client, {
      table: "tickets",
      select: "id",
      filters: [
        {
          op: "or",
          value:
            "origem_contexto->>tipo_fluxo.neq.recuperacao_2fa,public_message.not.is.null",
        },
      ],
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        `"origem_contexto"->>'tipo_fluxo' <> $1 OR "public_message" IS NOT NULL`
      ),
      ["recuperacao_2fa"]
    );
  });

  it("retorna a contagem exata de exclusoes", async () => {
    const { client } = databaseClient([{ id: "1" }, { id: "2" }]);

    const result = await executePainelNeonQuery(client, {
      table: "login_attempts",
      mutation: { kind: "delete", options: { count: "exact" } },
      filters: [{ op: "lt", column: "criado_em", value: "2026-08-01" }],
    });

    expect(result.count).toBe(2);
  });

  it("tipa lookup de chave primaria e remove undefined de upsert", async () => {
    const seen: Array<{ sql: string; values?: unknown[] }> = [];
    const client = scriptedClient((sql, values) => {
      seen.push({ sql, values });
      if (sql.includes("from pg_index")) return { rows: [{ column_name: "id" }] };
      return { rows: [{ id: "1", nome: "Teste" }], rowCount: 1 };
    });

    const query: PainelDbQuery = {
      table: "exemplo",
      select: "id,nome",
      mutation: {
        kind: "upsert",
        payload: { id: "1", nome: "Teste", opcional: undefined },
      },
      single: true,
    };

    const result = await executePainelNeonQuery(client, query);
    expect(result.error).toBeNull();
    const pk = seen.find((item) => item.sql.includes("from pg_index"));
    expect(pk?.sql).toContain("to_regclass($1::text)");
    expect(pk?.values).toEqual(["public.exemplo"]);
    const insert = seen.find((item) => item.sql.startsWith("INSERT INTO"));
    expect(insert?.sql).not.toContain("opcional");
    expect(insert?.sql).toContain('ON CONFLICT ("id")');
  });

  it("materializa relacao reversa como array e forward como objeto", async () => {
    const seen: string[] = [];
    let relationLookup = 0;
    const client = scriptedClient((sql) => {
      seen.push(sql);
      if (sql.includes("from pg_constraint")) {
        relationLookup += 1;
        if (relationLookup === 1) {
          return {
            rows: [
              {
                source_column: "id",
                relation_column: "id_campanha",
                direction: "reverse",
              },
            ],
          };
        }
        return {
          rows: [
            {
              source_column: "id_parceiro",
              relation_column: "id",
              direction: "forward",
            },
          ],
        };
      }
      return { rows: [] };
    });

    await executePainelNeonQuery(client, {
      table: "parceria_campanhas",
      select:
        "id,parceria_criativos(id,ativo),parceiros_comerciais(nome_fantasia)",
    });

    const select = seen.find((sql) => sql.startsWith("SELECT"));
    expect(select).toContain("jsonb_agg");
    expect(select).toContain("'[]'::jsonb");
    expect(select).toContain("to_jsonb(rel_row)");
  });
});

describe("executePainelNeonRpc", () => {
  it("usa tipos reais da assinatura PostgreSQL para evitar 42P18", async () => {
    const seen: Array<{ sql: string; values?: unknown[] }> = [];
    const client = scriptedClient((sql, values) => {
      seen.push({ sql, values });
      if (sql.includes("from pg_proc")) {
        return {
          rows: [
            {
              oid: 1,
              arg_names: ["p_id", "p_payload"],
              arg_types: ["uuid", "jsonb"],
            },
          ],
        };
      }
      return { rows: [{ result: true }] };
    });

    const result = await executePainelNeonRpc(client, {
      kind: "rpc",
      fn: "fn_teste",
      args: {
        p_id: "00000000-0000-0000-0000-000000000000",
        p_payload: {},
      },
    });

    expect(result.data).toBe(true);
    const call = seen.find((item) => item.sql.includes('public."fn_teste"'));
    expect(call?.sql).toContain("$1::uuid");
    expect(call?.sql).toContain("$2::jsonb");
  });
});
