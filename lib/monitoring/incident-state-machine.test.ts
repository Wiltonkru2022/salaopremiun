import { describe, expect, it } from "vitest";
import {
  canAutoResolveIncident,
  nextIncidentState,
  transitionComponentState,
} from "@/lib/monitoring/incident-state-machine";

describe("incident state machine", () => {
  it("requires consecutive failures before degrading", () => {
    expect(
      transitionComponentState({
        currentState: "operational",
        signal: "failed",
        criticality: "critical",
        consecutiveSuccesses: 0,
        consecutiveFailures: 1,
        failuresToDegrade: 2,
      })
    ).toBe("operational");
    expect(
      transitionComponentState({
        currentState: "operational",
        signal: "failed",
        criticality: "critical",
        consecutiveSuccesses: 0,
        consecutiveFailures: 2,
        failuresToDegrade: 2,
      })
    ).toBe("major_outage");
  });

  it("requires three healthy probes before recovery", () => {
    expect(
      transitionComponentState({
        currentState: "degraded",
        signal: "healthy",
        criticality: "high",
        consecutiveSuccesses: 2,
        consecutiveFailures: 0,
        successesToRecover: 3,
      })
    ).toBe("degraded");
    expect(
      transitionComponentState({
        currentState: "degraded",
        signal: "healthy",
        criticality: "high",
        consecutiveSuccesses: 3,
        consecutiveFailures: 0,
        successesToRecover: 3,
      })
    ).toBe("operational");
  });

  it("resolves only with combined evidence", () => {
    const now = new Date("2026-08-19T20:00:00Z");
    expect(
      canAutoResolveIncident({
        now,
        lastOccurrenceAt: "2026-08-19T18:00:00Z",
        recoveryWindowMs: 60 * 60 * 1000,
        componentState: "operational",
        healthyProbeCount: 3,
        requiredHealthyProbes: 3,
        errorRate: 0,
        maximumErrorRate: 1,
        dependenciesHealthy: true,
        deploymentHealthy: true,
        contradictoryEvidence: false,
      })
    ).toBe(true);
  });

  it("reopens a resolved incident when the fingerprint recurs", () => {
    expect(nextIncidentState({ current: "resolvido", newOccurrence: true })).toBe(
      "recorrente"
    );
  });
});
