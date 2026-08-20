import "server-only";

import { classifyOperationalError } from "@/lib/monitoring/error-catalog";
import { buildOperationalFingerprint, sanitizeOperationalText } from "@/lib/monitoring/fingerprint";
import { findOperationalComponentForContext } from "@/lib/monitoring/operational-components";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function sanitizeEvidence(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (depth > 3) return String(value).slice(0, 180);
  if (["string", "number", "boolean"].includes(typeof value)) {
    return typeof value === "string" ? sanitizeOperationalText(value).slice(0, 500) : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeEvidence(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/(secret|token|password|senha|api.?key|authorization|cpf|email|phone|telefone|whatsapp)/i.test(key))
        .slice(0, 30)
        .map(([key, current]) => [key, sanitizeEvidence(current, depth + 1)])
    );
  }
  return String(value).slice(0, 180);
}

function deploymentContext() {
  return {
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
  };
}

export async function observeOperationalFailure(params: {
  message: string;
  errorCode?: string | null;
  module?: string | null;
  action?: string | null;
  route?: string | null;
  origin?: string | null;
  stack?: string | null;
  componentKey?: string | null;
  details?: Record<string, unknown> | null;
}) {
  const rule = classifyOperationalError(params);
  const component =
    findOperationalComponentForContext({
      componentKey: params.componentKey || rule.componentKey,
      route: params.route,
      module: params.module,
      action: params.action,
    }) || null;

  if (!rule.opensIncident) {
    return {
      opened: false,
      classification: rule.code,
      componentKey: component?.componentKey || null,
      reason: "user_or_expected_behavior",
    };
  }

  const fingerprint = buildOperationalFingerprint({
    componentKey: component?.componentKey || rule.componentKey,
    module: params.module,
    action: params.action,
    route: params.route,
    errorCode: rule.code,
    message: params.message,
    stack: params.stack,
  });
  const deploy = deploymentContext();
  const reference = {
    route: params.route ? params.route.split("?")[0] : null,
    action: params.action || null,
    latestMessage: sanitizeOperationalText(params.message).slice(0, 500),
    latestDetails: sanitizeEvidence(params.details || {}),
    errorCode: rule.code,
    componentKey: component?.componentKey || null,
    deploymentId: deploy.deploymentId,
    commitSha: deploy.commitSha,
  };
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase.rpc("fn_operational_observe_incident", {
    p_fingerprint: fingerprint,
    p_chave: `operational:${fingerprint}`,
    p_titulo: rule.name,
    p_modulo: params.module || component?.surface || "sistema",
    p_severidade: rule.severity,
    p_component_key: component?.componentKey || rule.componentKey || null,
    p_catalog_code: rule.code,
    p_categoria: rule.category,
    p_sintoma: rule.symptom,
    p_causa_provavel: rule.probableCauses[0] || null,
    p_confianca: rule.confidence,
    p_responsavel: component?.owner || rule.owner,
    p_acao_sugerida: rule.recommendedAction,
    p_reference: reference,
    p_public_visible: Boolean(rule.publicSafe && component?.publicVisible),
    p_public_message: rule.publicSafe ? rule.symptom : null,
    p_deployment_id: deploy.deploymentId,
    p_commit_sha: deploy.commitSha,
    p_required_healthy_probes: 3,
  });
  if (error) throw error;

  const incident = Array.isArray(data) ? data[0] : data;
  await supabase.from("alertas_sistema").upsert(
    {
      chave: `monitoring:${fingerprint}`,
      tipo: "incidente_operacional",
      gravidade: rule.severity,
      origem_modulo: params.module || component?.surface || "sistema",
      titulo: rule.name,
      descricao: rule.symptom,
      payload_json: reference,
      resolvido: false,
      resolvido_por: null,
      resolvido_em: null,
      automatico: true,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "chave" }
  );

  return {
    opened: true,
    incidentId: incident?.incident_id || null,
    reopened: Boolean(incident?.reopened),
    fingerprint,
    classification: rule.code,
    componentKey: component?.componentKey || rule.componentKey || null,
  };
}
