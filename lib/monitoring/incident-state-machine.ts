import type { OperationalState } from "@/lib/monitoring/operational-components";

export type IncidentLifecycleState =
  | "detectado"
  | "aberto"
  | "investigando"
  | "recuperando"
  | "resolvido"
  | "recorrente"
  | "suprimido"
  | "manutencao";

export type ProbeSignal = "healthy" | "warning" | "failed" | "unknown";

export function transitionComponentState(params: {
  currentState: OperationalState;
  signal: ProbeSignal;
  criticality: "critical" | "high" | "medium" | "low";
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  successesToRecover?: number;
  failuresToDegrade?: number;
}) {
  const successesToRecover = Math.max(1, params.successesToRecover ?? 3);
  const failuresToDegrade = Math.max(1, params.failuresToDegrade ?? 2);

  if (params.signal === "unknown") return "unknown" as const;
  if (
    params.signal === "healthy" &&
    params.consecutiveSuccesses >= successesToRecover
  ) {
    return "operational" as const;
  }

  if (
    params.signal === "warning" &&
    params.consecutiveFailures >= failuresToDegrade
  ) {
    return "degraded" as const;
  }

  if (
    params.signal === "failed" &&
    params.consecutiveFailures >= failuresToDegrade
  ) {
    if (params.criticality === "critical") return "major_outage" as const;
    if (params.criticality === "high") return "partial_outage" as const;
    return "degraded" as const;
  }

  return params.currentState;
}

export function canAutoResolveIncident(params: {
  now: Date;
  lastOccurrenceAt?: string | null;
  recoveryWindowMs: number;
  componentState: OperationalState;
  healthyProbeCount: number;
  requiredHealthyProbes: number;
  errorRate: number;
  maximumErrorRate: number;
  dependenciesHealthy: boolean;
  deploymentHealthy: boolean;
  contradictoryEvidence: boolean;
}) {
  const lastOccurrence = params.lastOccurrenceAt
    ? Date.parse(params.lastOccurrenceAt)
    : Number.NaN;
  const quietWindowSatisfied =
    Number.isFinite(lastOccurrence) &&
    params.now.getTime() - lastOccurrence >= Math.max(0, params.recoveryWindowMs);

  return (
    quietWindowSatisfied &&
    params.componentState === "operational" &&
    params.healthyProbeCount >= Math.max(1, params.requiredHealthyProbes) &&
    params.errorRate <= params.maximumErrorRate &&
    params.dependenciesHealthy &&
    params.deploymentHealthy &&
    !params.contradictoryEvidence
  );
}

export function nextIncidentState(params: {
  current: IncidentLifecycleState;
  newOccurrence?: boolean;
  recoveryEvidence?: boolean;
  fullyRecovered?: boolean;
  suppressed?: boolean;
  maintenance?: boolean;
}) {
  if (params.maintenance) return "manutencao" as const;
  if (params.suppressed) return "suprimido" as const;
  if (params.newOccurrence && params.current === "resolvido") return "recorrente" as const;
  if (params.newOccurrence) return "aberto" as const;
  if (params.fullyRecovered) return "resolvido" as const;
  if (params.recoveryEvidence) return "recuperando" as const;
  return params.current;
}
