import { describe, expect, it } from "vitest";
import { normalizeSafeInternalPath } from "./safe-next-path";

describe("normalizeSafeInternalPath", () => {
  it("aceita somente rotas do app cliente", () => {
    expect(
      normalizeSafeInternalPath(
        "/app-cliente/agendamentos?status=ok",
        "/app-cliente",
        "/app-cliente/inicio"
      )
    ).toBe("/app-cliente/agendamentos?status=ok");
  });

  it("bloqueia destino externo e protocolo relativo", () => {
    const fallback = "/app-cliente/inicio";
    expect(normalizeSafeInternalPath("https://evil.example", "/app-cliente", fallback)).toBe(fallback);
    expect(normalizeSafeInternalPath("//evil.example/path", "/app-cliente", fallback)).toBe(fallback);
  });

  it("bloqueia rota de outra superficie", () => {
    expect(
      normalizeSafeInternalPath(
        "/admin-master",
        "/app-cliente",
        "/app-cliente/inicio"
      )
    ).toBe("/app-cliente/inicio");
  });
});
