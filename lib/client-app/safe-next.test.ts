import { describe, expect, it } from "vitest";
import { safeAppClienteNext } from "./safe-next";

describe("safeAppClienteNext", () => {
  it("aceita somente rotas internas do App Cliente", () => {
    expect(safeAppClienteNext("/app-cliente/inicio")).toBe("/app-cliente/inicio");
    expect(
      safeAppClienteNext("/app-cliente/salao/abc?status=lista_espera#topo")
    ).toBe("/app-cliente/salao/abc?status=lista_espera#topo");
  });

  it("bloqueia URLs externas e protocol-relative", () => {
    expect(safeAppClienteNext("https://golpe.example/phishing")).toBe(
      "/app-cliente/inicio"
    );
    expect(safeAppClienteNext("//golpe.example/phishing")).toBe(
      "/app-cliente/inicio"
    );
    expect(safeAppClienteNext("/\\golpe.example/phishing")).toBe(
      "/app-cliente/inicio"
    );
  });

  it("bloqueia rotas internas fora do App Cliente", () => {
    expect(safeAppClienteNext("/app-profissional/login")).toBe(
      "/app-cliente/inicio"
    );
    expect(safeAppClienteNext("/admin")).toBe("/app-cliente/inicio");
  });
});
