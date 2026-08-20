import "server-only";

import {
  aggregateOperationalState,
  calculateOperationalCoverage,
} from "@/lib/monitoring/health-aggregation";
import {
  listOperationalComponents,
  operationalStateLabel,
  type OperationalCriticality,
  type OperationalState,
} from "@/lib/monitoring/operational-components";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type OperationalSnapshotComponent = {
  componentKey: string;
  name: string;
  category: string;
  criticality: OperationalCriticality;
  owner: string;
  state: OperationalState;
  stateLabel: string;
  reason: string;
  monitored: boolean;
  fresh: boolean;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  publicVisible: boolean;
};

export type OperationalIncidentView = {
  id: string;
  title: string;
  status: string;
  severity: string;
  componentKey: string | null;
  componentName: string;
  symptom: string;
  cause: string;
  confidence: string;
  owner: string;
  action: string;
  firstOccurrenceAt: string;
  lastOccurrenceAt: string;
  occurrences: number;
  recovery: string;
  resolutionMode: string | null;
  publicVisible: boolean;
};

export type OperationalSecurityFindingView = {
  key: string;
  source: string;
  rule: string;
  title: string;
  severity: string;
  classification: string;
  entity: string;
  detail: string;
  reviewed: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function isFresh(updatedAt?: string | null, ttlSeconds?: number | null) {
  if (!updatedAt) return false;
  const timestamp = Date.parse(updatedAt);
  return (
    Number.isFinite(timestamp) &&
    Date.now() - timestamp <= Math.max(60, Number(ttlSeconds || 1800)) * 1000
  );
}

export async function getOperationalHealthSnapshot() {
  const supabase = getSupabaseAdmin() as any;
  const registry = listOperationalComponents();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const [
    componentsRes,
    checksRes,
    dependenciesRes,
    activeCountRes,
    recoveringCountRes,
    autoTodayRes,
    incidentsRes,
    eventStatsRes,
    resolutionStatsRes,
    securityFindingsRes,
    securityOpenCountRes,
  ] = await Promise.all([
    supabase
      .from("operational_components")
      .select("component_key, nome, categoria, criticidade, responsavel, visibilidade_publica, monitorado, estado_atual, motivo_estado, ultima_verificacao_em, ultimo_sucesso_em, ultima_falha_em, freshness_ttl_segundos, deployment_id, commit_sha, registry_version")
      .eq("habilitado", true),
    supabase
      .from("health_checks_sistema")
      .select("component_key, status, score, atualizado_em, freshness_ttl_segundos, sucessos_consecutivos, falhas_consecutivas, motivo_status, latency_ms, deployment_id, commit_sha")
      .order("atualizado_em", { ascending: false }),
    supabase
      .from("operational_component_dependencies")
      .select("component_key, depends_on_component_key, critica"),
    supabase
      .from("incidentes_sistema")
      .select("id", { count: "exact", head: true })
      .in("status", ["detectado", "aberto", "investigando", "recorrente"]),
    supabase
      .from("incidentes_sistema")
      .select("id", { count: "exact", head: true })
      .eq("status", "recuperando"),
    supabase
      .from("incidentes_sistema")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolvido")
      .eq("resolution_mode", "automatic")
      .gte("resolvido_em", startToday.toISOString()),
    supabase
      .from("incidentes_sistema")
      .select("id, titulo, status, severidade, component_key, sintoma, causa_provavel, confianca, responsavel, acao_sugerida, primeira_ocorrencia_em, ultima_ocorrencia_em, total_ocorrencias, healthy_probe_count, required_healthy_probes, resolution_mode, visibilidade_publica")
      .in("status", ["detectado", "aberto", "investigando", "recuperando", "recorrente"])
      .order("ultima_ocorrencia_em", { ascending: false })
      .limit(50),
    supabase.rpc("fn_operational_event_stats", { p_since: since24h }),
    supabase.rpc("fn_operational_resolution_stats", { p_since: since30d }),
    supabase
      .from("operational_security_findings")
      .select("finding_key, source, source_rule, title, severity, classification, entity_name, detail, reviewed, first_seen_at, last_seen_at")
      .is("resolved_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(40),
    supabase
      .from("operational_security_findings")
      .select("finding_key", { count: "exact", head: true })
      .is("resolved_at", null),
  ]);

  const dbRows = (componentsRes.data || []) as any[];
  const dbByKey = new Map(dbRows.map((row) => [row.component_key, row]));
  const checkByKey = new Map<string, any>();
  for (const row of checksRes.data || []) {
    if (row.component_key && !checkByKey.has(row.component_key)) {
      checkByKey.set(row.component_key, row);
    }
  }

  const components: OperationalSnapshotComponent[] = registry.map((definition) => {
    const row = dbByKey.get(definition.componentKey);
    const check = checkByKey.get(definition.componentKey);
    const fresh = isFresh(
      check?.atualizado_em || row?.ultima_verificacao_em,
      check?.freshness_ttl_segundos ||
        row?.freshness_ttl_segundos ||
        definition.freshnessTtlSeconds
    );
    const state: OperationalState = fresh
      ? ((row?.estado_atual || "unknown") as OperationalState)
      : "unknown";
    return {
      componentKey: definition.componentKey,
      name: definition.name,
      category: definition.category,
      criticality: definition.criticality,
      owner: definition.owner,
      state,
      stateLabel: operationalStateLabel(state),
      reason: fresh
        ? String(
            check?.motivo_status || row?.motivo_estado || "Monitoramento atualizado."
          )
        : "Monitoramento atrasado ou sem evidência recente.",
      monitored: Boolean(
        row?.monitorado ??
          (definition.monitoringMode !== "derived" || definition.probeKey)
      ),
      fresh,
      lastCheckedAt: check?.atualizado_em || row?.ultima_verificacao_em || null,
      lastSuccessAt: row?.ultimo_sucesso_em || null,
      lastFailureAt: row?.ultima_falha_em || null,
      publicVisible: definition.publicVisible,
    };
  });

  const overallState = aggregateOperationalState(
    components
      .filter((component) => component.criticality !== "low")
      .map((component) => ({
        componentKey: component.componentKey,
        criticality: component.criticality,
        state: component.state,
        monitored: component.monitored,
        fresh: component.fresh,
      }))
  );
  const coverage = calculateOperationalCoverage(
    components.map((component) => ({
      criticality: component.criticality,
      monitored: component.monitored,
    }))
  );

  const componentNames = new Map(
    components.map((component) => [component.componentKey, component.name])
  );
  const incidents: OperationalIncidentView[] = ((incidentsRes.data || []) as any[]).map(
    (row) => ({
      id: row.id,
      title: row.titulo,
      status: row.status,
      severity: row.severidade,
      componentKey: row.component_key || null,
      componentName:
        componentNames.get(row.component_key) ||
        row.component_key ||
        "Componente não identificado",
      symptom: row.sintoma || "Sintoma ainda não classificado.",
      cause: row.causa_provavel || "Causa ainda não comprovada.",
      confidence: row.confianca || "baixa",
      owner: row.responsavel || "Observabilidade",
      action:
        row.acao_sugerida ||
        "Coletar evidências adicionais antes de alterar o sistema.",
      firstOccurrenceAt: row.primeira_ocorrencia_em,
      lastOccurrenceAt: row.ultima_ocorrencia_em,
      occurrences: Number(row.total_ocorrencias || 0),
      recovery:
        row.status === "recuperando"
          ? `${Number(row.healthy_probe_count || 0)}/${Math.max(
              1,
              Number(row.required_healthy_probes || 3)
            )} probes saudáveis`
          : "-",
      resolutionMode: row.resolution_mode || null,
      publicVisible: Boolean(row.visibilidade_publica),
    })
  );

  const securityFindings: OperationalSecurityFindingView[] = (
    securityFindingsRes.data || []
  ).map((row: any) => ({
    key: row.finding_key,
    source: row.source,
    rule: row.source_rule || "unknown",
    title: row.title,
    severity: row.severity,
    classification: row.classification,
    entity: row.entity_name || "-",
    detail: row.detail || "Sem detalhe adicional.",
    reviewed: Boolean(row.reviewed),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  }));

  const statsRows = eventStatsRes.data || [];
  const totalEvents = statsRows.reduce(
    (sum: number, row: any) => sum + Number(row.total_events || 0),
    0
  );
  const failedEvents = statsRows.reduce(
    (sum: number, row: any) => sum + Number(row.failure_events || 0),
    0
  );
  const p95Values = statsRows
    .map((row: any) => Number(row.p95_ms || 0))
    .filter((value: number) => value > 0);
  const p95Ms = p95Values.length ? Math.max(...p95Values) : null;
  const resolution = (resolutionStatsRes.data || [])[0] || {};
  const avgMttrSeconds = Number(resolution.avg_mttr_seconds || 0) || null;

  const degraded = components.filter((component) =>
    ["degraded", "partial_outage", "major_outage"].includes(component.state)
  );
  const stale = components.filter((component) => !component.fresh);
  const withoutMonitor = components.filter((component) => !component.monitored);
  const latestDeployment =
    dbRows
      .filter((row) => row.commit_sha || row.deployment_id)
      .sort(
        (a, b) =>
          Date.parse(b.ultima_verificacao_em || "0") -
          Date.parse(a.ultima_verificacao_em || "0")
      )[0] || null;

  return {
    generatedAt: nowIso(),
    overall: {
      state: overallState,
      label: operationalStateLabel(overallState),
      summary:
        overallState === "operational"
          ? "Todos os componentes relevantes possuem evidência recente de operação saudável."
          : overallState === "unknown"
            ? "Não há evidência recente suficiente para declarar todos os sistemas operacionais."
            : "Há componente degradado ou indisponível que requer acompanhamento.",
    },
    coverage,
    metrics: {
      activeIncidents: Number(activeCountRes.count || 0),
      recoveringIncidents: Number(recoveringCountRes.count || 0),
      autoResolvedToday: Number(autoTodayRes.count || 0),
      totalEvents24h: totalEvents,
      failures24h: failedEvents,
      errorRate24h: totalEvents
        ? Number(((failedEvents / totalEvents) * 100).toFixed(2))
        : null,
      p95Ms,
      mttrSeconds: avgMttrSeconds,
      openSecurityFindings: Number(securityOpenCountRes.count || 0),
    },
    deployment: {
      id:
        latestDeployment?.deployment_id ||
        process.env.VERCEL_DEPLOYMENT_ID ||
        process.env.VERCEL_URL ||
        null,
      commitSha:
        latestDeployment?.commit_sha || process.env.VERCEL_GIT_COMMIT_SHA || null,
    },
    components,
    incidents,
    degraded,
    stale,
    withoutMonitor,
    securityFindings,
    eventStats: statsRows,
    dependencies: dependenciesRes.data || [],
  };
}

export type OperationalHealthSnapshot = Awaited<
  ReturnType<typeof getOperationalHealthSnapshot>
>;
