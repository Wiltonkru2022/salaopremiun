import "server-only";

import { neon } from "@neondatabase/serverless";

type EventLevel = "debug" | "info" | "warning" | "error" | "critical";

type NeonEventInput = {
  tenantId?: string | null;
  componentKey: string;
  eventType: string;
  level?: EventLevel | string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

type NeonMetricInput = {
  tenantId?: string | null;
  componentKey: string;
  metricName: string;
  metricValue: number;
  labels?: Record<string, unknown>;
};

const NEON_WRITE_TIMEOUT_MS = 1_800;

let sqlClient: ReturnType<typeof neon> | null = null;
let configuredUrl = "";

function databaseUrl() {
  return String(process.env.NEON_DATABASE_URL || "").trim();
}

function getSql() {
  const url = databaseUrl();
  if (!url) return null;

  if (!sqlClient || configuredUrl !== url) {
    sqlClient = neon(url);
    configuredUrl = url;
  }

  return sqlClient;
}

function safeObject(value?: Record<string, unknown>) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).slice(0, 50));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = NEON_WRITE_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("neon_write_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isNeonObservabilityConfigured() {
  return Boolean(databaseUrl());
}

export async function recordNeonEvent(input: NeonEventInput): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    const metadata = JSON.stringify(safeObject(input.metadata));
    await withTimeout(
      sql`
        insert into observability.event_log
          (tenant_id, component_key, event_type, level, message, metadata)
        values
          (${input.tenantId || null}, ${input.componentKey}, ${input.eventType}, ${input.level || "info"}, ${input.message || null}, ${metadata}::jsonb)
      ` as Promise<unknown>
    );
    return true;
  } catch (error) {
    console.warn("Neon observability event write failed:", error);
    return false;
  }
}

export async function recordNeonMetric(input: NeonMetricInput): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    const labels = JSON.stringify(safeObject(input.labels));
    await withTimeout(
      sql`
        insert into observability.metric_samples
          (tenant_id, component_key, metric_name, metric_value, labels)
        values
          (${input.tenantId || null}, ${input.componentKey}, ${input.metricName}, ${input.metricValue}, ${labels}::jsonb)
      ` as Promise<unknown>
    );
    return true;
  } catch (error) {
    console.warn("Neon observability metric write failed:", error);
    return false;
  }
}
