import { describe, expect, it } from "vitest";
import {
  canAutoResolveIncident,
  nextIncidentState,
  transitionComponentState,
} from "@/lib/monitoring/incident-state-machine";
import { buildOperationalFingerprint } from "@/lib/monitoring/fingerprint";

describe("operational lifecycle integration", () => {
  it("failure -> 1/2/3 healthy probes -> auto resolve -> same fingerprint reopens", () => {
    let componentState = transitionComponentState({
      currentState: "operational",
      signal: "failed",
      criticality: "critical",
      consecutiveSuccesses: 0,
      consecutiveFailures: 1,
      failuresToDegrade: 1,
    });
    expect(componentState).toBe("major_outage");

    componentState = transitionComponentState({
      currentState: componentState,
      signal: "healthy",
      criticality: "critical",
      consecutiveSuccesses: 1,
      consecutiveFailures: 0,
      successesToRecover: 3,
    });
    expect(componentState).toBe("major_outage");

    componentState = transitionComponentState({
      currentState: componentState,
      signal: "healthy",
      criticality: "critical",
      consecutiveSuccesses: 2,
      consecutiveFailures: 0,
      successesToRecover: 3,
    });
    expect(componentState).toBe("major_outage");

    componentState = transitionComponentState({
      currentState: componentState,
      signal: "healthy",
      criticality: "critical",
      consecutiveSuccesses: 3,
      consecutiveFailures: 0,
      successesToRecover: 3,
    });
    expect(componentState).toBe("operational");

    expect(
      canAutoResolveIncident({
        now: new Date("2026-08-19T20:00:00Z"),
        lastOccurrenceAt: "2026-08-19T18:00:00Z",
        recoveryWindowMs: 30 * 60 * 1000,
        componentState,
        healthyProbeCount: 3,
        requiredHealthyProbes: 3,
        errorRate: 0.3,
        maximumErrorRate: 2,
        dependenciesHealthy: true,
        deploymentHealthy: true,
        contradictoryEvidence: false,
      })
    ).toBe(true);

    expect(nextIncidentState({ current: "recuperando", fullyRecovered: true })).toBe("resolvido");
    expect(nextIncidentState({ current: "resolvido", newOccurrence: true })).toBe("recorrente");

    const before = buildOperationalFingerprint({
      componentKey: "client.appointments",
      module: "app-cliente",
      route: "/app-cliente/agendamentos/550e8400-e29b-41d4-a716-446655440000",
      errorCode: "react_hydration_mismatch",
      message: "Minified React error #418 at 2026-08-19T18:00:00Z",
    });
    const after = buildOperationalFingerprint({
      componentKey: "client.appointments",
      module: "app-cliente",
      route: "/app-cliente/agendamentos/11111111-1111-4111-8111-111111111111",
      errorCode: "react_hydration_mismatch",
      message: "Minified React error #418 at 2026-08-20T02:00:00Z",
    });
    expect(after).toBe(before);
  });

  it("does not auto resolve when deployment evidence is missing", () => {
    expect(
      canAutoResolveIncident({
        now: new Date("2026-08-19T20:00:00Z"),
        lastOccurrenceAt: "2026-08-19T18:00:00Z",
        recoveryWindowMs: 30 * 60 * 1000,
        componentState: "operational",
        healthyProbeCount: 5,
        requiredHealthyProbes: 3,
        errorRate: 0,
        maximumErrorRate: 2,
        dependenciesHealthy: true,
        deploymentHealthy: false,
        contradictoryEvidence: false,
      })
    ).toBe(false);
  });
});
