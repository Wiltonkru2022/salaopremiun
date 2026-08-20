import "server-only";

import { classifyOperationalError } from "@/lib/monitoring/error-catalog";
import { buildOperationalFingerprint, sanitizeOperationalText } from "@/lib/monitoring/fingerprint";
import { canAutoResolveIncident } from "@/lib/monitoring/incident-state-machine";
import { findOperationalComponentForContext } from "@/lib/monitoring/operational-components";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const RESOLVER_VERSION = "operational-reconciler-v1";
const RECOVERY_WINDOW_MS = 30 * 60 * 1000;

type IncidentRow = {
  id: string;
  chave: string;
  fingerprint?: string | null;
  titulo: string;
  modulo: string;
  severidade: string;
  status: string;
  primeira_ocorrencia_em: string;
  ultima_ocorrencia_em: string;
  total_ocorrencias: number;
  component_key?: string | null;
  catalog_code?: string | null;
  referencia_json?: Record<string, any> | null;
  required_healthy_probes?: number | null;
  healthy_probe_count?: number | null;
  primeiro_commit_sha?: string | null;
  ultimo_commit_sha?: string | null;
};

type ComponentRow = {
  component_key: string;
  estado_atual: string;
  criticidade: string;
  ultimo_sucesso_em?: string | null;
  ultima_falha_em?: string | null;
};

type CheckRow = {
  component_key?: string | null;
  status: string;
  atualizado_em: string;
  freshness_ttl_segundos?: number | null;
  sucessos_consecutivos?: number | null;
  falhas_consecutivas?: number | null;
  ultimo_sucesso_em?: string | null;
  deployment_id?: string | null;
  commit_sha?: string | null;
  evidence_json?: Record<string, unknown> | null;
};

function latestMessage(incident: IncidentRow) {
  return String(
    incident.referencia_json?.latestMessage ||
      incident.referencia_json?.message ||
      incident.titulo ||
      ""
  );
}

function latestRoute(incident: IncidentRow) {
  return String(
    incident.referencia_json?.route || incident.referencia_json?.screen || ""
  ).split("?")[0] || null;
}

function isExpectedLoginFailure(incident: IncidentRow) {
  const value = `${incident.titulo} ${latestMessage(incident)}`.toLowerCase();
  return /(?:^|_)login_falhou\b|profissional_app_login_falhou|admin_master_login_falhou/.test(value);
}

function isFresh(check: CheckRow | null, now: number) {
  if (!check?.atualizado_em) return false;
  const updated = Date.parse(check.atualizado_em);
  if (!Number.isFinite(updated)) return false;
  const ttl = Math.max(60, Number(check.freshness_ttl_segundos || 1800)) * 1000;
  return now - updated <= ttl;
}

async function writeTimeline(params: {
  incident: IncidentRow;
  from: string;
  to: string;
  message: string;
  details?: Record<string, unknown>;
  publicVisible?: boolean;
  publicMessage?: string | null;
}) {
  const supabase = getSupabaseAdmin() as any;
  await supabase.from("incident_updates").insert({
    incident_id: params.incident.id,
    status_from: params.from,
    status_to: params.to,
    mensagem: params.message,
    internal_details: params.details || {},
    public_visible: Boolean(params.publicVisible),
    public_message: params.publicMessage || null,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || null,
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
}

async function resolveLinkedAlerts(incident: IncidentRow, fingerprint?: string | null) {
  const supabase = getSupabaseAdmin() as any;
  const keys = [
    `monitoring:${incident.chave}`,
    fingerprint ? `monitoring:${fingerprint}` : null,
  ].filter(Boolean) as string[];
  if (!keys.length) return;
  await supabase
    .from("alertas_sistema")
    .update({ resolvido: true, resolvido_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .in("chave", keys);
}

export async function reconcileOperationalIncidents() {
  const supabase = getSupabaseAdmin() as any;
  const now = Date.now();
  const currentCommit = process.env.VERCEL_GIT_COMMIT_SHA || null;
  const currentDeployment = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || null;

  const [incidentsResult, allFingerprintsResult, componentsResult, checksResult, dependenciesResult, eventStatsResult] =
    await Promise.all([
      supabase
        .from("incidentes_sistema")
        .select("id, chave, fingerprint, titulo, modulo, severidade, status, primeira_ocorrencia_em, ultima_ocorrencia_em, total_ocorrencias, component_key, catalog_code, referencia_json, required_healthy_probes, healthy_probe_count, primeiro_commit_sha, ultimo_commit_sha")
        .in("status", ["detectado", "aberto", "investigando", "recuperando", "recorrente"])
        .order("primeira_ocorrencia_em", { ascending: true })
        .limit(250),
      supabase.from("incidentes_sistema").select("id, fingerprint, status").not("fingerprint", "is", null).limit(1000),
      supabase.from("operational_components").select("component_key, estado_atual, criticidade, ultimo_sucesso_em, ultima_falha_em"),
      supabase.from("health_checks_sistema").select("component_key, status, atualizado_em, freshness_ttl_segundos, sucessos_consecutivos, falhas_consecutivas, ultimo_sucesso_em, deployment_id, commit_sha, evidence_json"),
      supabase.from("operational_component_dependencies").select("component_key, depends_on_component_key, critica"),
      supabase.rpc("fn_operational_event_stats", { p_since: new Date(now - 24 * 60 * 60 * 1000).toISOString() }),
    ]);

  if (incidentsResult.error) throw incidentsResult.error;
  const incidents = (incidentsResult.data || []) as IncidentRow[];
  const components = new Map<string, ComponentRow>(
    ((componentsResult.data || []) as ComponentRow[]).map((row) => [row.component_key, row])
  );
  const checks = new Map<string, CheckRow>();
  for (const row of (checksResult.data || []) as CheckRow[]) {
    if (row.component_key && !checks.has(row.component_key)) checks.set(row.component_key, row);
  }
  const dependencies = new Map<string, string[]>();
  for (const row of dependenciesResult.data || []) {
    if (!row.critica) continue;
    const current = dependencies.get(row.component_key) || [];
    current.push(row.depends_on_component_key);
    dependencies.set(row.component_key, current);
  }
  const stats = new Map<string, any>(
    (eventStatsResult.data || []).map((row: any) => [String(row.modulo || "sistema"), row])
  );
  const fingerprintOwner = new Map<string, string>();
  for (const row of allFingerprintsResult.data || []) {
    if (row.fingerprint) fingerprintOwner.set(String(row.fingerprint), String(row.id));
  }

  const summary = {
    examined: 0,
    autoResolved: 0,
    recovering: 0,
    suppressedDuplicates: 0,
    expectedBehavior: 0,
    insufficientEvidence: 0,
  };

  for (const incident of incidents) {
    summary.examined += 1;
    const message = latestMessage(incident);
    const route = latestRoute(incident);

    if (isExpectedLoginFailure(incident)) {
      const previous = incident.status;
      const evidence = {
        classification: "expected_user_behavior",
        reason: "Tentativa de autenticação recusada sem evidência de falha interna do serviço.",
        preservedSecurityTelemetry: true,
      };
      await supabase
        .from("incidentes_sistema")
        .update({
          status: "resolvido",
          catalog_code: "invalid_user_credentials",
          categoria: "user_behavior",
          sintoma: "Tentativa de login recusada.",
          causa_provavel: "Credenciais inválidas ou tentativa automatizada de acesso.",
          confianca: "alta",
          responsavel: "Segurança/Auth",
          resolution_mode: "automatic",
          resolution_confidence: "alta",
          recovery_verified_at: new Date().toISOString(),
          resolvido_em: new Date().toISOString(),
          resolution_reason: "Comportamento de usuário/segurança; não representa indisponibilidade do Auth isoladamente.",
          resolution_evidence: evidence,
          resolver_version: RESOLVER_VERSION,
          updated_at: new Date().toISOString(),
        })
        .eq("id", incident.id);
      await writeTimeline({ incident, from: previous, to: "resolvido", message: "Reclassificado automaticamente como comportamento esperado de autenticação, não outage.", details: evidence });
      await resolveLinkedAlerts(incident, incident.fingerprint);
      summary.expectedBehavior += 1;
      summary.autoResolved += 1;
      continue;
    }

    const rule = classifyOperationalError({
      message,
      errorCode: incident.catalog_code,
      module: incident.modulo,
      route,
    });
    const component = findOperationalComponentForContext({
      componentKey: incident.component_key || rule.componentKey,
      route,
      module: incident.modulo,
    });
    const candidateFingerprint = buildOperationalFingerprint({
      componentKey: component?.componentKey || rule.componentKey,
      module: incident.modulo,
      route,
      errorCode: rule.code,
      message,
      action: String(incident.referencia_json?.action || ""),
    });
    const existingOwner = fingerprintOwner.get(candidateFingerprint);

    if (existingOwner && existingOwner !== incident.id) {
      const previous = incident.status;
      await supabase
        .from("incidentes_sistema")
        .update({
          status: "suprimido",
          component_key: component?.componentKey || null,
          catalog_code: rule.code,
          categoria: "duplicate",
          root_cause_candidate: `incident:${existingOwner}`,
          resolution_reason: "Incidente duplicado correlacionado ao mesmo fingerprint operacional.",
          resolution_evidence: { canonicalIncidentId: existingOwner, candidateFingerprint },
          resolver_version: RESOLVER_VERSION,
          updated_at: new Date().toISOString(),
        })
        .eq("id", incident.id);
      await writeTimeline({ incident, from: previous, to: "suprimido", message: "Duplicado correlacionado automaticamente a um incidente canônico.", details: { canonicalIncidentId: existingOwner } });
      await resolveLinkedAlerts(incident, incident.fingerprint);
      summary.suppressedDuplicates += 1;
      continue;
    }

    fingerprintOwner.set(candidateFingerprint, incident.id);
    const componentKey = component?.componentKey || null;
    const componentState = componentKey ? components.get(componentKey) : null;
    const check = componentKey ? checks.get(componentKey) || null : null;
    const fresh = isFresh(check, now);
    const probeCount = fresh && check?.status === "ok" ? Number(check.sucessos_consecutivos || 0) : 0;
    const required = Math.max(1, Number(incident.required_healthy_probes || 3));
    const moduleStats = stats.get(incident.modulo);
    const totalEvents = Number(moduleStats?.total_events || 0);
    const failures = Number(moduleStats?.failure_events || 0);
    const errorRate = totalEvents ? (failures / totalEvents) * 100 : 0;
    const deps = componentKey ? dependencies.get(componentKey) || [] : [];
    const dependenciesHealthy = deps.every((dependency) => components.get(dependency)?.estado_atual === "operational");
    const deploymentHealthy = Boolean(
      fresh &&
        check?.status === "ok" &&
        ((currentCommit && check.commit_sha === currentCommit) ||
          (currentDeployment && check.deployment_id === currentDeployment) ||
          (!currentCommit && !currentDeployment))
    );
    const contradictoryEvidence = Boolean(
      componentState?.ultima_falha_em &&
        Date.parse(componentState.ultima_falha_em) > Date.parse(incident.ultima_ocorrencia_em)
    );
    const canResolve = Boolean(
      componentState &&
        canAutoResolveIncident({
          now: new Date(now),
          lastOccurrenceAt: incident.ultima_ocorrencia_em,
          recoveryWindowMs: RECOVERY_WINDOW_MS,
          componentState: componentState.estado_atual as any,
          healthyProbeCount: probeCount,
          requiredHealthyProbes: required,
          errorRate,
          maximumErrorRate: 2,
          dependenciesHealthy,
          deploymentHealthy,
          contradictoryEvidence,
        })
    );

    const commonUpdate = {
      fingerprint: candidateFingerprint,
      component_key: componentKey,
      catalog_code: rule.code,
      categoria: rule.category,
      sintoma: rule.symptom,
      causa_provavel: rule.probableCauses[0] || null,
      confianca: rule.confidence,
      responsavel: component?.owner || rule.owner,
      acao_sugerida: rule.recommendedAction,
      healthy_probe_count: probeCount,
      first_healthy_at: probeCount > 0 ? (incident as any).first_healthy_at || check?.ultimo_sucesso_em || check?.atualizado_em : null,
      last_success_at: check?.status === "ok" ? check.atualizado_em : null,
      last_failed_probe_at: check?.status === "critical" || check?.status === "warning" ? check.atualizado_em : null,
      ultimo_deployment_id: currentDeployment,
      ultimo_commit_sha: currentCommit,
      resolver_version: RESOLVER_VERSION,
      updated_at: new Date().toISOString(),
    };

    if (canResolve) {
      const previous = incident.status;
      const evidence = {
        quietWindowMinutes: Math.round((now - Date.parse(incident.ultima_ocorrencia_em)) / 60000),
        healthyProbeCount: probeCount,
        requiredHealthyProbes: required,
        componentState: componentState?.estado_atual,
        errorRate24h: Number(errorRate.toFixed(2)),
        dependenciesHealthy,
        deploymentHealthy,
        probeUpdatedAt: check?.atualizado_em,
        probeEvidence: check?.evidence_json || {},
      };
      await supabase
        .from("incidentes_sistema")
        .update({
          ...commonUpdate,
          status: "resolvido",
          resolution_mode: "automatic",
          resolution_confidence: probeCount >= required + 2 ? "alta" : "media",
          recovery_verified_at: new Date().toISOString(),
          resolvido_em: new Date().toISOString(),
          resolved_deployment_id: currentDeployment,
          resolved_commit_sha: currentCommit,
          resolution_reason: `Recuperação confirmada por ${probeCount} probe(s) saudável(is), janela sem recorrência e dependências saudáveis.`,
          resolution_evidence: evidence,
        })
        .eq("id", incident.id);
      await writeTimeline({
        incident,
        from: previous,
        to: "resolvido",
        message: "Recuperação confirmada automaticamente por evidências convergentes.",
        details: evidence,
        publicVisible: Boolean((incident as any).visibilidade_publica),
        publicMessage: "Recuperação confirmada. O componente voltou ao estado operacional.",
      });
      await resolveLinkedAlerts(incident, candidateFingerprint);
      summary.autoResolved += 1;
      continue;
    }

    const hasRecoveryEvidence = Boolean(fresh && check?.status === "ok" && probeCount > 0);
    const targetStatus = hasRecoveryEvidence ? "recuperando" : componentKey ? "investigando" : "investigando";
    if (targetStatus !== incident.status) {
      await writeTimeline({
        incident,
        from: incident.status,
        to: targetStatus,
        message: hasRecoveryEvidence
          ? `Recuperação em verificação: ${probeCount}/${required} probe(s) saudável(is).`
          : "Incidente em investigação; ainda não há evidência suficiente para resolução automática.",
        details: { fresh, probeCount, required, dependenciesHealthy, deploymentHealthy, errorRate24h: Number(errorRate.toFixed(2)) },
      });
    }
    await supabase
      .from("incidentes_sistema")
      .update({ ...commonUpdate, status: targetStatus })
      .eq("id", incident.id);

    if (hasRecoveryEvidence) summary.recovering += 1;
    else summary.insufficientEvidence += 1;
  }

  return summary;
}
