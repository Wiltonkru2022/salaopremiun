import { getErrorMessage } from "@/lib/get-error-message";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  MonitoringOrigin,
  MonitoringPayload,
  MonitoringSeverity,
} from "@/lib/monitoring/types";

type CaptureSystemEventParams = MonitoringPayload & {
  createIncident?: boolean;
  incidentKey?: string | null;
  incidentTitle?: string | null;
  incidentRule?: string | null;
  suggestedAction?: string | null;
  automationAvailable?: boolean;
};

type CaptureSystemMetricParams = Omit<CaptureSystemEventParams, "message"> & {
  metric: string;
  value: number;
  unit?: string | null;
  message?: string;
};

type CaptureSystemErrorParams = Omit<CaptureSystemEventParams, "message"> & {
  error: unknown;
  fallbackMessage?: string;
};

type RunMonitoredServerOperationParams = Omit<
  CaptureSystemEventParams,
  "message" | "eventType" | "success" | "responseMs"
> & {
  successMessage?: string;
  errorMessage?: string;
  successEventType?: string;
  failureEventType?: string;
};

type RegisterAutomationActionParams = {
  type: string;
  reference?: string | null;
  executed: boolean;
  success: boolean;
  log: string;
  details?: Record<string, unknown>;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeSeverity(value?: MonitoringSeverity | null): MonitoringSeverity {
  const normalized = normalizeText(value).toLowerCase();

  if (
    normalized === "debug" ||
    normalized === "info" ||
    normalized === "warning" ||
    normalized === "error" ||
    normalized === "critical"
  ) {
    return normalized;
  }

  return "info";
}

function normalizeOrigin(value?: MonitoringOrigin | null): MonitoringOrigin {
  const normalized = normalizeText(value).toLowerCase();

  if (
    normalized === "client" ||
    normalized === "server" ||
    normalized === "api" ||
    normalized === "server_action" ||
    normalized === "webhook" ||
    normalized === "cron" ||
    normalized === "integration"
  ) {
    return normalized;
  }

  return "server";
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (depth > 2) return String(value);

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, currentValue]) => [key, sanitizeValue(currentValue, depth + 1)])
    );
  }

  return String(value);
}

function sanitizeDetails(value?: Record<string, unknown>) {
  return (sanitizeValue(value || {}, 0) || {}) as Record<string, unknown>;
}

function summarizeStack(stack?: string | null) {
  return String(stack || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function inferUserError(message: string, errorCode?: string | null) {
  const normalized = `${normalizeText(errorCode)} ${message}`.toLowerCase();

  return [
    "unauthorized",
    "forbidden",
    "acesso negado",
    "sessao invalida",
    "nao autenticado",
    "não autenticado",
    "inativo",
    "not found",
    "nao encontrado",
    "não encontrado",
    "invalid",
    "invalido",
    "inválido",
    "obrigatorio",
    "obrigatório",
    "preencha",
    "permissao",
    "permissão",
  ].some((entry) => normalized.includes(entry));
}

function shouldOpenIncident(params: CaptureSystemEventParams, severity: MonitoringSeverity) {
  if (typeof params.createIncident === "boolean") {
    return params.createIncident;
  }

  return severity === "error" || severity === "critical";
}

function buildIncidentTitle(params: CaptureSystemEventParams) {
  return (
    normalizeText(params.incidentTitle) ||
    normalizeText(params.message) ||
    `${normalizeText(params.module)} ${normalizeText(params.action)}`.trim() ||
    "Incidente operacional"
  );
}

function buildIncidentKey(params: CaptureSystemEventParams) {
  if (normalizeText(params.incidentKey)) {
    return normalizeText(params.incidentKey);
  }

  const base = [
    normalizeText(params.idSalao),
    normalizeText(params.module),
    normalizeText(params.action),
    normalizeText(params.errorCode),
    slugify(normalizeText(params.message)).slice(0, 40),
  ]
    .filter(Boolean)
    .join(":");

  return base || `incidente:${Date.now()}`;
}

function mapIncidentSeverity(severity: MonitoringSeverity) {
  if (severity === "critical") return "critica";
  if (severity === "error") return "alta";
  if (severity === "warning") return "media";
  return "baixa";
}

function mapAlertSeverity(severity: MonitoringSeverity) {
  if (severity === "critical") return "critica";
  if (severity === "error") return "alta";
  if (severity === "warning") return "media";
  return "baixa";
}

async function upsertIncident(params: CaptureSystemEventParams, severity: MonitoringSeverity) {
  const supabase = getSupabaseAdmin();
  const chave = buildIncidentKey(params);
  const titulo = buildIncidentTitle(params);
  const impactoSaloes = params.idSalao ? 1 : 0;
  const referencia = {
    action: params.action || null,
    entity: params.entity || null,
    entityId: params.entityId || null,
    route: params.route || null,
    screen: params.screen || null,
    latestMessage: params.message,
    latestDetails: sanitizeDetails(params.details),
  };

  const { data: existing } = await supabase
    .from("incidentes_sistema")
    .select("id, total_ocorrencias, impacto_saloes")
    .eq("chave", chave)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("incidentes_sistema")
      .update({
        titulo,
        modulo: normalizeText(params.module) || "sistema",
        severidade: mapIncidentSeverity(severity),
        status: "aberto",
        regra_origem: normalizeText(params.incidentRule) || null,
        impacto_saloes: Math.max(Number(existing.impacto_saloes || 0), impactoSaloes),
        total_ocorrencias: Number(existing.total_ocorrencias || 0) + 1,
        ultima_ocorrencia_em: new Date().toISOString(),
        acao_sugerida: normalizeText(params.suggestedAction) || null,
        resolucao_automatica_disponivel: Boolean(params.automationAvailable),
        referencia_json: referencia,
        resolvido_em: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("incidentes_sistema").insert({
      chave,
      titulo,
      modulo: normalizeText(params.module) || "sistema",
      severidade: mapIncidentSeverity(severity),
      status: "aberto",
      regra_origem: normalizeText(params.incidentRule) || null,
      impacto_saloes: impactoSaloes,
      total_ocorrencias: 1,
      primeira_ocorrencia_em: new Date().toISOString(),
      ultima_ocorrencia_em: new Date().toISOString(),
      acao_sugerida: normalizeText(params.suggestedAction) || null,
      resolucao_automatica_disponivel: Boolean(params.automationAvailable),
      referencia_json: referencia,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  await supabase.from("alertas_sistema").upsert(
    {
      chave: `monitoring:${chave}`,
      tipo: "incidente_operacional",
      gravidade: mapAlertSeverity(severity),
      origem_modulo: normalizeText(params.module) || "sistema",
      id_salao: params.idSalao || null,
      titulo,
      descricao: normalizeText(params.message) || titulo,
      payload_json: referencia,
      resolvido: false,
      automatico: true,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "chave" }
  );
}

export async function captureSystemEvent(params: CaptureSystemEventParams) {
  try {
    const severity = normalizeSeverity(params.severity);
    const supabase = getSupabaseAdmin();
    const message = normalizeText(params.message) || "Evento operacional";
    const isUserError =
      typeof params.isUserError === "boolean"
        ? params.isUserError
        : inferUserError(message, params.errorCode);

    await supabase.from("eventos_sistema").insert({
      id_salao: params.idSalao || null,
      id_usuario: params.idUsuario || null,
      id_admin_usuario: params.idAdminUsuario || null,
      modulo: normalizeText(params.module) || "sistema",
      tipo_evento: normalizeText(params.eventType) || "ui_event",
      severidade: severity,
      mensagem: message,
      detalhes_json: sanitizeDetails(params.details),
      origem: normalizeOrigin(params.origin),
      superficie: normalizeText(params.surface) || null,
      rota: normalizeText(params.route) || null,
      tela: normalizeText(params.screen) || null,
      acao: normalizeText(params.action) || null,
      entidade: normalizeText(params.entity) || null,
      entidade_id: normalizeText(params.entityId) || null,
      browser: normalizeText(params.browser) || null,
      device: normalizeText(params.device) || null,
      response_ms:
        typeof params.responseMs === "number"
          ? Math.max(0, Math.round(params.responseMs))
          : null,
      sucesso:
        typeof params.success === "boolean" ? params.success : severity !== "error" && severity !== "critical",
      eh_erro_usuario: isUserError,
      codigo_erro: normalizeText(params.errorCode) || null,
      stack_resumida: summarizeStack(params.stack),
      created_at: new Date().toISOString(),
    });

    if (shouldOpenIncident(params, severity)) {
      await upsertIncident(params, severity);
    }
  } catch (error) {
    console.error("Falha ao capturar evento de monitoramento:", error);
  }
}

export async function captureSystemMetric(params: CaptureSystemMetricParams) {
  const details = {
    ...(params.details || {}),
    metric: params.metric,
    value: params.value,
    unit: params.unit || null,
  };

  await captureSystemEvent({
    ...params,
    eventType: "metric",
    severity: params.severity || "info",
    message:
      params.message ||
      `${normalizeText(params.metric)} registrado em ${normalizeText(params.module)}`,
    details,
    success: true,
    createIncident: false,
  });
}

export async function captureSystemError(params: CaptureSystemErrorParams) {
  const fallback =
    params.fallbackMessage ||
    `${normalizeText(params.module)} falhou em ${normalizeText(params.action)}`;
  const message = getErrorMessage(params.error, fallback);

  await captureSystemEvent({
    ...params,
    eventType: params.eventType || "error",
    severity: params.severity || (inferUserError(message, params.errorCode) ? "warning" : "error"),
    message,
    stack:
      params.error instanceof Error ? params.error.stack || params.stack || null : params.stack || null,
    success: false,
  });
}

export async function runMonitoredServerOperation<T>(
  params: RunMonitoredServerOperationParams,
  operation: () => Promise<T>
) {
  const startedAt = Date.now();

  try {
    const result = await operation();
    await captureSystemEvent({
      ...params,
      eventType: params.successEventType || "action_succeeded",
      severity: params.severity || "info",
      message:
        params.successMessage ||
        `${normalizeText(params.module)} executou ${normalizeText(params.action)} com sucesso`,
      responseMs: Date.now() - startedAt,
      success: true,
      createIncident: false,
    });
    return result;
  } catch (error) {
    await captureSystemError({
      ...params,
      eventType: params.failureEventType || "action_failed",
      error,
      fallbackMessage:
        params.errorMessage ||
        `${normalizeText(params.module)} falhou em ${normalizeText(params.action)}`,
      responseMs: Date.now() - startedAt,
      success: false,
    });
    throw error;
  }
}

export async function registrarAcaoAutomaticaSistema(
  params: RegisterAutomationActionParams
) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("acoes_automaticas_sistema").insert({
      tipo: normalizeText(params.type) || "automacao",
      referencia: normalizeText(params.reference) || null,
      executada: params.executed,
      sucesso: params.success,
      log: normalizeText(params.log) || "Acao automatica registrada.",
      detalhes_json: sanitizeDetails(params.details),
      created_at: new Date().toISOString(),
      executada_em: params.executed ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("Falha ao registrar acao automatica:", error);
  }
}

export async function upsertSystemHealthCheck(params: {
  key: string;
  name: string;
  status: "ok" | "warning" | "critical";
  score: number;
  details?: Record<string, unknown>;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("health_checks_sistema").upsert(
      {
        chave: normalizeText(params.key),
        nome: normalizeText(params.name) || "Health check",
        status: normalizeText(params.status) || "ok",
        score: Math.max(0, Math.min(100, Math.round(params.score))),
        detalhes_json: sanitizeDetails(params.details),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "chave" }
    );
  } catch (error) {
    console.error("Falha ao atualizar health check:", error);
  }
}
