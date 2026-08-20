import { describe, expect, it } from "vitest";
import {
  aggregateOperationalState,
  calculateOperationalCoverage,
} from "@/lib/monitoring/health-aggregation";

describe("operational health aggregation", () => {
  it("reports operational only when every relevant monitor is fresh and healthy", () => {
    expect(
      aggregateOperationalState([
        { componentKey: "database", criticality: "critical", state: "operational", monitored: true, fresh: true },
        { componentKey: "site", criticality: "high", state: "operational", monitored: true, fresh: true },
      ])
    ).toBe("operational");
  });

  it("never reports operational when monitoring is stale", () => {
    expect(
      aggregateOperationalState([
        { componentKey: "database", criticality: "critical", state: "operational", monitored: true, fresh: false },
      ])
    ).toBe("unknown");
  });

  it("reports degraded for a monitored secondary degradation", () => {
    expect(
      aggregateOperationalState([
        { componentKey: "database", criticality: "critical", state: "operational", monitored: true, fresh: true },
        { componentKey: "email", criticality: "medium", state: "degraded", monitored: true, fresh: true },
      ])
    ).toBe("degraded");
  });

  it("propagates a critical major outage", () => {
    expect(
      aggregateOperationalState([
        { componentKey: "database", criticality: "critical", state: "major_outage", monitored: true, fresh: true },
        { componentKey: "site", criticality: "high", state: "operational", monitored: true, fresh: true },
      ])
    ).toBe("major_outage");
  });

  it("calculates total and critical coverage mathematically", () => {
    const coverage = calculateOperationalCoverage([
      { criticality: "critical", monitored: true },
      { criticality: "critical", monitored: false },
      { criticality: "medium", monitored: true },
    ]);
    expect(coverage.percentage).toBe(66.7);
    expect(coverage.criticalPercentage).toBe(50);
  });
});
