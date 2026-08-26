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

const LEGACY_COMPONENT_KEYS: Record<string, string> = {
  "supabase.database": "neon.database",
  "supabase.data_api": "neon.data_api",
  "supabase.auth": "clerk.auth",
  "supabase.storage": "cloudinary.storage",
  "supabase.realtime": "platform.realtime",
};

function normalizeComponentKey(value: string) {
  return LEGACY_COMPONENT_KEYS[value] || value;
}

function normalizeProbeKey(value?: string) {
  if (!value) return value;
  return value
    .replace(/^probe:supabase:database$/, "probe:neon:database")
    .replace(/^probe:supabase:data-api$/, "probe:neon:data-api")
    .replace(/^probe:supabase:auth$/, "probe:clerk:auth")
    .replace(/^probe:supabase:storage$/, "probe:cloudinary:storage")
    .replace(/^probe:supabase:realtime$/, "probe:platform:realtime");
}

function normalizeLegacyComponent(
  component: OperationalComponentDefinition
): OperationalComponentDefinition {
  const key = normalizeComponentKey(component.componentKey);
  const normalized: OperationalComponentDefinition = {
    ...component,
    componentKey: key,
    probeKey: normalizeProbeKey(component.probeKey),
    sourcePatterns: (component.sourcePatterns || []).map((pattern) =>
      pattern
        .replace("lib/supabase/**", "lib/neon/**")
        .replace("supabase/migrations/**", "database/migrations/**")
    ),
    dependencies: (component.dependencies || []).map(normalizeComponentKey),
  };

  if (key === "neon.database") {
    return {
      ...normalized,
      name: "Neon PostgreSQL",
      description: "PostgreSQL principal do SalãoPremium hospedado no Neon.",
      category: "Neon",
    };
  }
  if (key === "neon.data_api") {
    return {
      ...normalized,
      name: "Neon Data Access",
      description: "Camada server-side de acesso ao PostgreSQL Neon.",
      category: "Neon",
    };
  }
  if (key === "clerk.auth") {
    return {
      ...normalized,
      name: "Clerk Auth",
      description: "Autenticação e validação de sessão do Painel e Admin Master via Clerk.",
      category: "Clerk",
    };
  }
  if (key === "cloudinary.storage") {
    return {
      ...normalized,
      name: "Cloudinary Media",
      description: "Armazenamento e entrega de imagens e mídia do sistema via Cloudinary.",
      category: "Cloudinary",
    };
  }
  if (key === "platform.realtime") {
    return {
      ...normalized,
      name: "Atualização em tempo real",
      description: "Atualizações reativas da aplicação sem dependência de Supabase Realtime.",
      category: "Plataforma",
    };
  }
  return normalized;
}

const rawRegistry = registryJson as RegistryShape;
const registry: RegistryShape = {
  version: `${rawRegistry.version}-neon`,
  components: rawRegistry.components.map(normalizeLegacyComponent),
};

export const OPERATIONAL_REGISTRY_VERSION = registry.version;
export const OPERATIONAL_COMPONENTS = Object.freeze(registry.components);

const componentMap = new Map(
  OPERATIONAL_COMPONENTS.map((component) => [component.componentKey, component])
);

export function getOperationalComponent(componentKey?: string | null) {
  const normalizedKey = normalizeComponentKey(String(componentKey || "").trim());
  return componentMap.get(normalizedKey) || null;
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
