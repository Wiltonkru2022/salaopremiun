import { describe, expect, it } from "vitest";
import {
  aggregateOperationalState,
  calculateOperationalCoverage,
} from "@/lib/monitoring/health-aggregation";

describe("operational health aggregation", () => {
  it("never reports operational when monitoring is stale", () => {
    expect(
      aggregateOperationalState([
        {
          componentKey: "database",
          criticality: "critical",
          state: "operational",
          monitored: true,
          fresh: false,
        },
      ])
    ).toBe("unknown");
  });

  it("propagates a critical major outage", () => {
    expect(
      aggregateOperationalState([
        {
          componentKey: "database",
          criticality: "critical",
          state: "major_outage",
          monitored: true,
          fresh: true,
        },
        {
          componentKey: "site",
          criticality: "high",
          state: "operational",
          monitored: true,
          fresh: true,
        },
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
