import { describe, expect, it, vi } from "vitest";
import { executePainelNeonQuery } from "@/lib/neon/painel-query.server";

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
});
