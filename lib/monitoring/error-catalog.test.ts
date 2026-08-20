import { describe, expect, it } from "vitest";
import { classifyOperationalError } from "@/lib/monitoring/error-catalog";

describe("operational error catalog", () => {
  it("recognizes React #418 and explicitly rejects masking the cause", () => {
    const rule = classifyOperationalError({
      message: "Minified React error #418",
      route: "/app-cliente/agendamentos",
    });
    expect(rule.code).toBe("react_hydration_mismatch");
    expect(rule.recommendedAction).toMatch(/determin/i);
    expect(rule.recommendedAction).toMatch(/n[aã]o mascarar/i);
  });

  it("does not open operational incident for ordinary invalid credentials", () => {
    const rule = classifyOperationalError({ message: "CPF ou senha invalidos." });
    expect(rule.code).toBe("invalid_user_credentials");
    expect(rule.opensIncident).toBe(false);
  });

  it("falls back to unknown rule", () => {
    expect(classifyOperationalError({ message: "erro nunca visto xyz" }).code).toBe(
      "unknown_operational_error"
    );
  });
});
