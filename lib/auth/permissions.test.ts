import { describe, expect, it } from "vitest";
import { sanitizePermissoesDb } from "@/lib/auth/permissions";

describe("sanitizePermissoesDb", () => {
  it("maps legacy permission columns to current permission keys", () => {
    const result = sanitizePermissoesDb({
      caixa_fechar: true,
      comissoes_pagar: true,
      estoque_movimentar: true,
    });

    expect(result.caixa_finalizar).toBe(true);
    expect(result.comissoes_editar).toBe(true);
    expect(result.comissoes_financeiro).toBe(true);
    expect(result.estoque_operar).toBe(true);
  });

  it("keeps explicit current permission values above legacy aliases", () => {
    const result = sanitizePermissoesDb({
      caixa_fechar: true,
      caixa_finalizar: false,
    });

    expect(result.caixa_finalizar).toBe(false);
  });
});
