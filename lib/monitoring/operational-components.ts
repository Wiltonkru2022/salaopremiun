import registryJson from "@/config/operational-components.json";

export type OperationalCriticality = "critical" | "high" | "medium" | "low";
export type OperationalState =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";
export type OperationalMonitoringMode = "probe" | "telemetry" | "derived";

export type OperationalComponentDefinition = {
  componentKey: string;
  name: string;
  description: string;
  category: string;
  surface: string;
  criticality: OperationalCriticality;
  owner: string;
  publicVisible: boolean;
  monitoringMode: OperationalMonitoringMode;
  probeType: string;
  probeKey?: string;
  expectedIntervalSeconds: number;
  freshnessTtlSeconds: number;
  timeoutMs: number;
  sourcePatterns: string[];
  routePrefixes?: string[];
  contentSignals?: string[];
  dependencies: string[];
};

type RegistryShape = {
  version: string;
  components: OperationalComponentDefinition[];
};

const registry = registryJson as RegistryShape;

export const OPERATIONAL_REGISTRY_VERSION = registry.version;
export const OPERATIONAL_COMPONENTS = Object.freeze(registry.components);

const componentMap = new Map(
  OPERATIONAL_COMPONENTS.map((component) => [component.componentKey, component])
);

export function getOperationalComponent(componentKey?: string | null) {
  return componentMap.get(String(componentKey || "").trim()) || null;
}

export function listOperationalComponents() {
  return [...OPERATIONAL_COMPONENTS];
}

export function getOperationalProbeKey(
  component: Pick<OperationalComponentDefinition, "componentKey" | "probeKey">
) {
  return (
    component.probeKey ||
    `probe:${component.componentKey.replace(/[^a-z0-9]+/gi, ":").toLowerCase()}`
  );
}

export function findOperationalComponentForContext(params: {
  componentKey?: string | null;
  route?: string | null;
  module?: string | null;
  action?: string | null;
}) {
  const explicit = getOperationalComponent(params.componentKey);
  if (explicit) return explicit;

  const route = String(params.route || "").split("?")[0];
  if (route) {
    const candidates = OPERATIONAL_COMPONENTS
      .filter((component) =>
        (component.routePrefixes || []).some((prefix) => route.startsWith(prefix))
      )
      .sort((a, b) => {
        const aLength = Math.max(
          ...(a.routePrefixes || [""]).map((value) => value.length)
        );
        const bLength = Math.max(
          ...(b.routePrefixes || [""]).map((value) => value.length)
        );
        return bLength - aLength;
      });
    if (candidates[0]) return candidates[0];
  }

  const module = String(params.module || "").toLowerCase();
  const action = String(params.action || "").toLowerCase();
  const combined = `${module}:${action}`;

  if (combined.includes("asaas") || combined.includes("checkout")) {
    return getOperationalComponent("integration.asaas.api");
  }
  if (combined.includes("webhook")) {
    return getOperationalComponent("integration.asaas.webhooks");
  }
  if (module.includes("agenda") || action.includes("agendamento")) {
    return getOperationalComponent("agenda.core");
  }
  if (
    module.includes("caixa") ||
    module.includes("comanda") ||
    module.includes("venda")
  ) {
    return getOperationalComponent("cash.core");
  }
  if (module.includes("security") || module.includes("auth")) {
    return getOperationalComponent("database.auth");
  }

  return null;
}

export function operationalStateLabel(state: OperationalState) {
  if (state === "operational") return "Operacional";
  if (state === "degraded") return "Desempenho degradado";
  if (state === "partial_outage") return "Interrupção parcial";
  if (state === "major_outage") return "Interrupção grave";
  if (state === "maintenance") return "Manutenção";
  return "Estado desconhecido";
}
