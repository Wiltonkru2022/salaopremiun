import { describe, expect, it } from "vitest";
import {
  CLIENT_VISUAL_NOTIFICATION_CHANNEL,
  isClientVisualNoticeActive,
  normalizeClientVisualNoticeUrl,
  parseClientVisualNoticeConfig,
  parseSaoPauloDateTimeLocal,
  sortClientVisualNotices,
} from "./visual-notifications";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "notice-1",
    titulo: "Estamos em manutenção",
    descricao: "Voltamos em breve.",
    tipo: "manutencao",
    publico_tipo: "clientes",
    filtros_json: {
      canal: CLIENT_VISUAL_NOTIFICATION_CHANNEL,
      apresentacao: "modal",
      dispensavel: false,
      bloqueante: true,
      prioridade: 50,
      fim_em: "2026-08-19T12:00:00.000Z",
    },
    status: "publicada",
    agendada_em: "2026-08-19T05:00:00.000Z",
    criada_em: "2026-08-19T04:00:00.000Z",
    ...overrides,
  };
}

describe("client visual notifications", () => {
  it("parses blocking notices as non-dismissible modal", () => {
    const config = parseClientVisualNoticeConfig(row().filtros_json);
    expect(config?.bloqueante).toBe(true);
    expect(config?.dispensavel).toBe(false);
    expect(config?.apresentacao).toBe("modal");
  });

  it("rejects rows from another channel", () => {
    expect(parseClientVisualNoticeConfig({ canal: "push" })).toBeNull();
  });

  it("enforces start and end windows", () => {
    expect(
      isClientVisualNoticeActive(row(), new Date("2026-08-19T06:00:00.000Z"))
    ).toBe(true);
    expect(
      isClientVisualNoticeActive(row(), new Date("2026-08-19T04:59:59.000Z"))
    ).toBe(false);
    expect(
      isClientVisualNoticeActive(row(), new Date("2026-08-19T12:00:00.000Z"))
    ).toBe(false);
  });

  it("does not expose notices to unrelated audiences", () => {
    expect(
      isClientVisualNoticeActive(
        row({ publico_tipo: "profissionais" }),
        new Date("2026-08-19T06:00:00.000Z")
      )
    ).toBe(false);
  });

  it("sorts by priority before creation time", () => {
    const ordered = sortClientVisualNotices([
      row({ id: "low", filtros_json: { ...row().filtros_json, prioridade: 1 } }),
      row({
        id: "high",
        filtros_json: { ...row().filtros_json, prioridade: 80 },
      }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("accepts only internal navigation URLs", () => {
    expect(normalizeClientVisualNoticeUrl("/app-cliente/inicio")).toBe(
      "/app-cliente/inicio"
    );
    expect(normalizeClientVisualNoticeUrl("https://example.com")).toBeNull();
    expect(normalizeClientVisualNoticeUrl("//example.com")).toBeNull();
  });

  it("converts Sao Paulo local time to an offset-aware ISO timestamp", () => {
    expect(parseSaoPauloDateTimeLocal("2026-08-19T03:30")).toBe(
      "2026-08-19T06:30:00.000Z"
    );
  });
});
