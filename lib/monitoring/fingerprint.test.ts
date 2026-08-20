import { describe, expect, it } from "vitest";
import {
  buildOperationalFingerprint,
  normalizeRouteForFingerprint,
  sanitizeOperationalText,
} from "@/lib/monitoring/fingerprint";

describe("operational fingerprint", () => {
  it("normalizes UUIDs, query strings and dynamic ids", () => {
    expect(
      normalizeRouteForFingerprint(
        "/clientes/550e8400-e29b-41d4-a716-446655440000?token=secret"
      )
    ).toBe("/clientes/:uuid");
  });

  it("redacts PII and volatile values from messages", () => {
    const sanitized = sanitizeOperationalText(
      "CPF 06691143167 user@email.com 550e8400-e29b-41d4-a716-446655440000 2026-08-19T12:17:43Z"
    );
    expect(sanitized).not.toContain("06691143167");
    expect(sanitized).not.toContain("user@email.com");
    expect(sanitized).not.toContain("550e8400");
  });

  it("deduplicates the same logical incident with different ids", () => {
    const a = buildOperationalFingerprint({
      componentKey: "client.appointments",
      module: "app-cliente",
      action: "window_error",
      route: "/app-cliente/agendamentos/550e8400-e29b-41d4-a716-446655440000",
      errorCode: "react_hydration_mismatch",
      message: "Minified React error #418 at 2026-08-19T12:17:43Z",
    });
    const b = buildOperationalFingerprint({
      componentKey: "client.appointments",
      module: "app-cliente",
      action: "window_error",
      route: "/app-cliente/agendamentos/11111111-1111-4111-8111-111111111111",
      errorCode: "react_hydration_mismatch",
      message: "Minified React error #418 at 2026-08-20T01:00:00Z",
    });
    expect(a).toBe(b);
  });
});
