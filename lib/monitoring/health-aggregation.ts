import type {
  OperationalCriticality,
  OperationalState,
} from "@/lib/monitoring/operational-components";

export type HealthAggregationComponent = {
  componentKey: string;
  criticality: OperationalCriticality;
  state: OperationalState;
  publicVisible?: boolean;
  monitored: boolean;
  fresh: boolean;
};

const STATE_WEIGHT: Record<OperationalState, number> = {
  operational: 0,
  degraded: 1,
  partial_outage: 2,
  major_outage: 3,
  maintenance: 1,
  unknown: 1,
};

const CRITICALITY_WEIGHT: Record<OperationalCriticality, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function calculateOperationalCoverage(
  components: Array<{ criticality: OperationalCriticality; monitored: boolean }>
) {
  const total = components.length;
  const monitored = components.filter((component) => component.monitored).length;
  const critical = components.filter((component) => component.criticality === "critical");
  const criticalMonitored = critical.filter((component) => component.monitored).length;

  return {
    total,
    monitored,
    unmonitored: total - monitored,
    percentage: total ? Number(((monitored / total) * 100).toFixed(1)) : 0,
    criticalTotal: critical.length,
    criticalMonitored,
    criticalPercentage: critical.length
      ? Number(((criticalMonitored / critical.length) * 100).toFixed(1))
      : 0,
  };
}

export function aggregateOperationalState(components: HealthAggregationComponent[]) {
  if (!components.length) return "unknown" as OperationalState;

  if (components.some((component) => !component.monitored || !component.fresh)) {
    return "unknown" as OperationalState;
  }

  const ranked = [...components].sort((a, b) => {
    const aScore = STATE_WEIGHT[a.state] * CRITICALITY_WEIGHT[a.criticality];
    const bScore = STATE_WEIGHT[b.state] * CRITICALITY_WEIGHT[b.criticality];
    return bScore - aScore;
  });

  const worst = ranked[0];
  if (!worst) return "unknown" as OperationalState;

  if (
    components.some(
      (component) =>
        component.criticality === "critical" && component.state === "major_outage"
    )
  ) {
    return "major_outage" as OperationalState;
  }
  if (
    components.some(
      (component) =>
        ["critical", "high"].includes(component.criticality) &&
        component.state === "partial_outage"
    )
  ) {
    return "partial_outage" as OperationalState;
  }
  if (components.some((component) => component.state === "degraded")) {
    return "degraded" as OperationalState;
  }
  if (components.some((component) => component.state === "maintenance")) {
    return "maintenance" as OperationalState;
  }
  if (components.every((component) => component.state === "operational")) {
    return "operational" as OperationalState;
  }

  return worst.state === "operational" ? "unknown" : worst.state;
}
