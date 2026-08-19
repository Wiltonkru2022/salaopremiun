import { describe, expect, it } from "vitest";
import {
  applyInputMask,
  detectInputMask,
  maskCpfCnpj,
  maskPhoneBr,
  normalizeMaskedValue,
} from "@/lib/utils/input-masks";

describe("input masks", () => {
  it("mascara CPF e remove a mascara para persistencia", () => {
    const masked = applyInputMask("cpf", "06308175102");
    expect(masked).toBe("063.081.751-02");
    expect(normalizeMaskedValue("cpf", masked)).toBe("06308175102");
  });

  it("mascara telefone brasileiro com e sem DDI", () => {
    expect(maskPhoneBr("67991427335")).toBe("(67) 99142-7335");
    expect(maskPhoneBr("5567991427335")).toBe("+55 (67) 99142-7335");
    expect(normalizeMaskedValue("phone", "+55 (67) 99142-7335")).toBe(
      "5567991427335"
    );
  });

  it("mascara CEP e mantém somente dígitos para persistência", () => {
    const masked = applyInputMask("cep", "79645210");
    expect(masked).toBe("79645-210");
    expect(normalizeMaskedValue("cep", masked)).toBe("79645210");
  });

  it("mascara data de nascimento em DD/MM/AAAA", () => {
    expect(applyInputMask("birthdate", "24011997")).toBe("24/01/1997");
    expect(applyInputMask("birthdate", "1997-01-24")).toBe("24/01/1997");
  });

  it("mascara CPF ou CNPJ sem perder dígitos", () => {
    expect(maskCpfCnpj("12345678901")).toBe("123.456.789-01");
    expect(maskCpfCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("detecta campos pelo nome sem confundir telefone ou e-mail legado", () => {
    expect(detectInputMask({ name: "cpf", type: "text" })).toBe("cpf");
    expect(detectInputMask({ name: "data_nascimento", type: "text" })).toBe(
      "birthdate"
    );
    expect(detectInputMask({ name: "whatsapp", type: "tel" })).toBe("phone");
    expect(detectInputMask({ name: "cep", type: "text" })).toBe("cep");
    expect(
      detectInputMask({
        name: "identidade",
        placeholder: "Telefone ou e-mail antigo",
        type: "text",
      })
    ).toBeNull();
  });

  it("detecta inputs reutilizaveis pelo label visivel", () => {
    expect(detectInputMask({ label: "CPF", type: "text" })).toBe("cpf");
    expect(detectInputMask({ label: "Telefone", type: "text" })).toBe("phone");
    expect(detectInputMask({ label: "WhatsApp", type: "text" })).toBe("phone");
    expect(detectInputMask({ label: "CEP", type: "text" })).toBe("cep");
    expect(detectInputMask({ label: "Data de nascimento", type: "text" })).toBe(
      "birthdate"
    );
    expect(
      detectInputMask({ label: "Telefone ou e-mail antigo", type: "text" })
    ).toBeNull();
  });
});
