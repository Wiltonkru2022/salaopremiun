import { describe, expect, it } from "vitest";
import { isValidCpf, maskCpf, normalizeCpf, parseClienteBirthDate } from "@/lib/client-app/identity";

describe("identidade do App Cliente", () => {
  it("normaliza e valida CPF formatado", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
  });

  it("rejeita CPF curto, repetido e com dígito verificador inválido", () => {
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("52998224724")).toBe(false);
  });

  it("aceita datas reais e rejeita datas inexistentes ou futuras", () => {
    expect(parseClienteBirthDate("04/09/1995")).toBe("1995-09-04");
    expect(parseClienteBirthDate("1995-09-04")).toBe("1995-09-04");
    expect(parseClienteBirthDate("31/02/2020")).toBeNull();
    expect(parseClienteBirthDate("29/02/2024")).toBe("2024-02-29");
    expect(parseClienteBirthDate("2999-01-01")).toBeNull();
  });
});
