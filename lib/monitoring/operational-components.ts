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

const LEGACY_PROVIDER_KEYS: Record<string, string> = {
  "database.database": "neon.database",
  "database.data_api": "neon.gateway",
  "database.auth": "clerk.auth",
  "database.storage": "cloudinary.storage",
  "database.periodic_sync": "neon.sync",
};

const PROVIDER_PRESENTATION: Record<
  string,
  Pick<OperationalComponentDefinition, "name" | "description" | "category" | "owner"> & {
    sourcePatterns?: string[];
  }
> = {
  "neon.database": {
    name: "Neon Database",
    description: "PostgreSQL principal do SalãoPremium hospedado no Neon.",
    category: "Neon",
    owner: "Backend/Dados",
    sourcePatterns: ["lib/neon/**", "database/migrations/**"],
  },
  "neon.gateway": {
    name: "Gateway Neon",
    description: "Camada server-side de consultas, RPCs e acesso ao PostgreSQL Neon.",
    category: "Neon",
    owner: "Backend/Dados",
    sourcePatterns: ["lib/neon/**", "lib/db/**", "app/api/**"],
  },
  "clerk.auth": {
    name: "Clerk Auth",
    description: "Autenticação, sessão, MFA e identidades administrativas via Clerk.",
    category: "Clerk",
    owner: "Segurança/Auth",
    sourcePatterns: ["lib/platform/clerk-**", "app/**/clerk/**", "lib/auth/**"],
  },
  "cloudinary.storage": {
    name: "Cloudinary Media",
    description: "Armazenamento e entrega de imagens e arquivos de mídia do sistema.",
    category: "Cloudinary",
    owner: "Backend/Mídia",
    sourcePatterns: ["lib/platform/cloudinary.server.ts", "services/**/*Media*", "app/api/**"],
  },
  "neon.sync": {
    name: "Sincronização periódica Neon",
    description: "Atualização periódica de agenda, caixa e PWAs através do gateway Neon.",
    category: "Neon",
    owner: "Backend/Sincronização",
  },
};

function canonicalComponentKey(value: string) {
  const normalized = String(value || "").trim();
  return LEGACY_PROVIDER_KEYS[normalized] || normalized;
}

function normalizeComponent(
  component: OperationalComponentDefinition
): OperationalComponentDefinition {
  const componentKey = canonicalComponentKey(component.componentKey);
  const presentation = PROVIDER_PRESENTATION[componentKey];
  const dependencies = component.dependencies.map(canonicalComponentKey);

  // Clerk e Cloudinary são serviços independentes do Neon. Mantemos os aliases
  // do JSON antigo apenas para preservar compatibilidade com telemetria histórica.
  const normalizedDependencies =
    componentKey === "clerk.auth" || componentKey === "cloudinary.storage"
      ? dependencies.filter((dependency) => dependency !== "neon.database")
      : dependencies;

  return {
    ...component,
    componentKey,
    dependencies: normalizedDependencies,
    ...(presentation || {}),
    ...(presentation?.sourcePatterns
      ? { sourcePatterns: presentation.sourcePatterns }
      : {}),
  };
}

export const OPERATIONAL_REGISTRY_VERSION = `${registry.version}-neon-clerk-cloudinary`;
export const OPERATIONAL_COMPONENTS = Object.freeze(
  registry.components.map(normalizeComponent)
);

const componentMap = new Map(
  OPERATIONAL_COMPONENTS.map((component) => [component.componentKey, component])
);

export function getOperationalComponent(componentKey?: string | null) {
  return componentMap.get(canonicalComponentKey(String(componentKey || ""))) || null;
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
