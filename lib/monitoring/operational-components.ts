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

const COMPONENT_RENAMES: Record<
  string,
  Pick<OperationalComponentDefinition, "componentKey" | "name" | "description" | "category" | "probeType"> & {
    probeKey: string;
  }
> = {
  "supabase.database": {
    componentKey: "neon.database",
    name: "Neon PostgreSQL",
    description: "PostgreSQL principal do SalãoPremium hospedado no Neon.",
    category: "Neon",
    probeType: "database",
    probeKey: "probe:neon:database",
  },
  "supabase.data_api": {
    componentKey: "neon.gateway",
    name: "Gateway de dados Neon",
    description: "Camada server-side que atende painel, Admin Master e apps sobre o Neon.",
    category: "Neon",
    probeType: "database",
    probeKey: "probe:neon:gateway",
  },
  "supabase.auth": {
    componentKey: "clerk.auth",
    name: "Clerk Auth",
    description: "Autenticação e sessão do painel do salão via Clerk.",
    category: "Autenticação",
    probeType: "auth",
    probeKey: "probe:clerk:auth",
  },
  "supabase.storage": {
    componentKey: "cloudinary.storage",
    name: "Cloudinary Storage",
    description: "Armazenamento de mídia e arquivos públicos do sistema.",
    category: "Armazenamento",
    probeType: "storage",
    probeKey: "probe:cloudinary:storage",
  },
  "supabase.realtime": {
    componentKey: "neon.sync",
    name: "Sincronização de dados",
    description: "Sincronização dos apps por APIs internas e Neon, sem Realtime Supabase.",
    category: "Neon",
    probeType: "database",
    probeKey: "probe:neon:sync",
  },
};

function renamedKey(value: string) {
  return COMPONENT_RENAMES[value]?.componentKey || value;
}

function normalizeComponent(component: OperationalComponentDefinition) {
  const rename = COMPONENT_RENAMES[component.componentKey];
  const normalized: OperationalComponentDefinition = rename
    ? {
        ...component,
        ...rename,
        sourcePatterns: component.sourcePatterns.map((pattern) =>
          pattern
            .replace(/lib\/supabase\/\*\*/g, "lib/neon/**")
            .replace(/supabase\/migrations\/\*\*/g, "lib/neon/**")
        ),
        contentSignals:
          component.componentKey === "supabase.realtime" ? ["/api/app-profissional/"] : component.contentSignals,
      }
    : { ...component };

  normalized.dependencies = normalized.dependencies.map(renamedKey);
  return normalized;
}

const sourceRegistry = registryJson as RegistryShape;
const registry: RegistryShape = {
  version: `${sourceRegistry.version}-neon`,
  components: sourceRegistry.components.map(normalizeComponent),
};

export const OPERATIONAL_REGISTRY_VERSION = registry.version;
export const OPERATIONAL_COMPONENTS = Object.freeze(registry.components);

const componentMap = new Map(
  OPERATIONAL_COMPONENTS.map((component) => [component.componentKey, component])
);

export function getOperationalComponent(componentKey?: string | null) {
  const normalized = renamedKey(String(componentKey || "").trim());
  return componentMap.get(normalized) || null;
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
        const aLength = Math.max(...(a.routePrefixes || [""]).map((value) => value.length));
        const bLength = Math.max(...(b.routePrefixes || [""]).map((value) => value.length));
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
  if (module.includes("caixa") || module.includes("comanda") || module.includes("venda")) {
    return getOperationalComponent("cash.core");
  }
  if (module.includes("security") || module.includes("auth")) {
    return getOperationalComponent("clerk.auth");
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
