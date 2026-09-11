import {
  formatObservabilityCleanupSummary,
  OBSERVABILITY_RETENTION_DEFAULTS,
  type ObservabilityCleanupRow,
} from "@/lib/monitoring/retention";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

const CRON_NAME = "limpar_observabilidade";
const CRON_ROUTE = "/api/cron/limpar-observabilidade";
const OPERATIONAL_PROBE_HISTORY_DAYS = 1;
const AUDIT_ARCHIVE_DAYS = 30;

async function recordCron(
  status: string,
  resumo: string,
  payload: Record<string, unknown>,
  erroTexto?: string | null
) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from("eventos_cron").insert({
    nome: CRON_NAME,
    status,
    resumo,
    payload_json: payload as Json,
    erro_texto: erroTexto || null,
    finalizado_em: status === "executando" ? null : new Date().toISOString(),
  });
}

async function archiveOldAuditLogs() {
  const cutoff = new Date(Date.now() - AUDIT_ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { archived: 0, batches: 0, cutoff, retentionDays: AUDIT_ARCHIVE_DAYS };
}

async function archiveOldTelemetryRows(input: {
  tableName: "operational_probe_history" | "eventos_cron";
  timestampColumn: "checked_at" | "iniciado_em";
  retentionDays: number;
}) {
  const cutoff = new Date(Date.now() - input.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  return { archived: 0, batches: 0, cutoff, retentionDays: input.retentionDays };
}

export async function limparObservabilidade() {
  await recordCron("executando", "Iniciando limpeza de observabilidade.", {
    route: CRON_ROUTE,
    retention: OBSERVABILITY_RETENTION_DEFAULTS,
    auditArchiveDays: AUDIT_ARCHIVE_DAYS,
    operationalProbeHistoryDays: OPERATIONAL_PROBE_HISTORY_DAYS,
  });

  const supabaseAdmin = getSupabaseAdmin();
  const auditArchive = await archiveOldAuditLogs();
  const probeArchive = await archiveOldTelemetryRows({
    tableName: "operational_probe_history",
    timestampColumn: "checked_at",
    retentionDays: OPERATIONAL_PROBE_HISTORY_DAYS,
  });
  const cronArchive = await archiveOldTelemetryRows({
    tableName: "eventos_cron",
    timestampColumn: "iniciado_em",
    retentionDays: OBSERVABILITY_RETENTION_DEFAULTS.eventosCronDays,
  });

  const [{ data, error }, { data: operationalData, error: operationalError }] =
    await Promise.all([
      supabaseAdmin.rpc("fn_observability_retention_cleanup", {
        p_eventos_sistema_days:
          OBSERVABILITY_RETENTION_DEFAULTS.eventosSistemaDays,
        p_logs_sistema_days: OBSERVABILITY_RETENTION_DEFAULTS.logsSistemaDays,
        p_auditoria_logs_days:
          OBSERVABILITY_RETENTION_DEFAULTS.auditoriaLogsDays,
        p_acoes_automaticas_days:
          OBSERVABILITY_RETENTION_DEFAULTS.acoesAutomaticasDays,
        p_eventos_webhook_days:
          OBSERVABILITY_RETENTION_DEFAULTS.eventosWebhookDays,
        p_eventos_cron_days: OBSERVABILITY_RETENTION_DEFAULTS.eventosCronDays,
        p_batch_limit: OBSERVABILITY_RETENTION_DEFAULTS.batchLimit,
      }),
      (supabaseAdmin as any).rpc("fn_operational_retention_cleanup", {
        p_probe_history_days: OPERATIONAL_PROBE_HISTORY_DAYS,
        p_incident_update_days: 365,
        p_delivery_days: 180,
        p_batch_limit: Math.min(
          OBSERVABILITY_RETENTION_DEFAULTS.batchLimit,
          500
        ),
      }),
    ]);

  if (error) throw error;
  if (operationalError) throw operationalError;

  const rows = (data || []) as ObservabilityCleanupRow[];
  const operationalRows = (operationalData || []) as ObservabilityCleanupRow[];
  const summary = formatObservabilityCleanupSummary([...rows, ...operationalRows]);

  const payload = {
    route: CRON_ROUTE,
    totalRemovido: summary.total,
    tabelas: summary.detail,
    auditArchive,
    probeArchive,
    cronArchive,
    retention: {
      ...OBSERVABILITY_RETENTION_DEFAULTS,
      auditArchiveDays: AUDIT_ARCHIVE_DAYS,
      operationalProbeHistoryDays: OPERATIONAL_PROBE_HISTORY_DAYS,
      incidentUpdatesDays: 365,
      statusDeliveriesDays: 180,
    },
  };

  await recordCron(
    "sucesso",
    `${summary.summary} Retenção concluída integralmente no Supabase.`,
    payload
  );

  return {
    route: CRON_ROUTE,
    totalRemovido: summary.total,
    tabelas: summary.detail,
    auditArchive,
    probeArchive,
    cronArchive,
    retention: {
      ...OBSERVABILITY_RETENTION_DEFAULTS,
      operationalProbeHistoryDays: OPERATIONAL_PROBE_HISTORY_DAYS,
    },
    resumo: summary.summary,
  };
}

export async function registrarFalhaLimpezaObservabilidade(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Erro ao limpar eventos antigos do sistema.";

  try {
    await recordCron("erro", "Cron de limpeza de observabilidade falhou.", {}, message);
  } catch {
    // Best effort: telemetria nunca deve derrubar o fluxo principal.
  }

  try {
    await reportOperationalIncident({
      supabaseAdmin: getSupabaseAdmin(),
      key: "cron:limpar-observabilidade:erro",
      module: "cron_observabilidade",
      title: "Cron de limpeza de observabilidade falhou",
      description: message,
      severity: "alta",
      details: { route: CRON_ROUTE },
    });
  } catch {
    // Best effort: telemetria nunca deve derrubar o fluxo principal.
  }
}
