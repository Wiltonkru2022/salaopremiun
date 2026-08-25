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

type NeonArchiveRow = {
  id: string;
  id_salao?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

const NEON_WRITE_TIMEOUT_MS = 1_800;
const NEON_ARCHIVE_TIMEOUT_MS = 8_000;

type NeonSql = ReturnType<typeof import("@neondatabase/serverless")["neon"]>;

let sqlClient: NeonSql | null = null;
let configuredUrl = "";

function isServerRuntime() {
  return typeof window === "undefined";
}

function databaseUrl() {
  if (!isServerRuntime()) return "";
  return String(process.env.NEON_DATABASE_URL || "").trim();
}

async function getSql(): Promise<NeonSql | null> {
  const url = databaseUrl();
  if (!url) return null;

  if (!sqlClient || configuredUrl !== url) {
    const { neon } = await import("@neondatabase/serverless");
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
  const sql = await getSql();
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
  const sql = await getSql();
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

export async function archiveNeonRows(
  sourceTable: string,
  rows: NeonArchiveRow[]
): Promise<{ ok: boolean; archived: number }> {
  const sql = await getSql();
  if (!sql || !rows.length) return { ok: Boolean(sql), archived: 0 };

  try {
    const payload = JSON.stringify(rows.slice(0, 500));
    const rawResult = await withTimeout(
      sql`
        with incoming as (
          select value
          from jsonb_array_elements(${payload}::jsonb) as value
        ), archived as (
          insert into observability.archive_events
            (source_table, source_id, tenant_id, occurred_at, payload)
          select
            ${sourceTable},
            value ->> 'id',
            nullif(value ->> 'id_salao', ''),
            coalesce(nullif(value ->> 'created_at', '')::timestamptz, now()),
            value
          from incoming
          where coalesce(value ->> 'id', '') <> ''
          on conflict (source_table, source_id) do update
            set tenant_id = excluded.tenant_id,
                occurred_at = excluded.occurred_at,
                payload = excluded.payload,
                archived_at = now()
          returning source_id
        )
        select count(*)::int as archived from archived
      ` as Promise<unknown>,
      NEON_ARCHIVE_TIMEOUT_MS
    );

    const result = rawResult as Array<{ archived?: number }>;
    return { ok: true, archived: Number(result?.[0]?.archived || 0) };
  } catch (error) {
    console.warn("Neon archive batch write failed:", error);
    return { ok: false, archived: 0 };
  }
}
