import { archiveNeonRows, recordNeonEvent } from "@/lib/neon/observability.server";
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
const ARCHIVE_BATCH = 500;
const ARCHIVE_MAX_BATCHES = 10;

type AuditArchiveRow = {
  id: string;
  id_salao: string | null;
  auth_user_id: string | null;
  id_usuario: string | null;
  modulo: string | null;
  entidade: string | null;
  entidade_id: string | null;
  acao: string | null;
  descricao: string | null;
  dados_anteriores: Json | null;
  dados_novos: Json | null;
  metadata: Json | null;
  created_at: string;
};

async function recordCron(
  status: string,
  resumo: string,
  payload: Record<string, unknown>,
  erroTexto?: string | null
) {
  const storedInNeon = await recordNeonEvent({
    componentKey: "cron.observability_cleanup",
    eventType: `cron_${status}`,
    level: status === "erro" ? "error" : "info",
    message: resumo,
    metadata: {
      cronName: CRON_NAME,
      route: CRON_ROUTE,
      status,
      payload,
      erroTexto: erroTexto || null,
    },
  });

  if (storedInNeon) return;

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
  const supabaseAdmin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - AUDIT_ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let archived = 0;
  let batches = 0;

  for (let batch = 0; batch < ARCHIVE_MAX_BATCHES; batch += 1) {
    const { data, error } = await supabaseAdmin
      .from("auditoria_logs")
      .select(
        "id,id_salao,auth_user_id,id_usuario,modulo,entidade,entidade_id,acao,descricao,dados_anteriores,dados_novos,metadata,created_at"
      )
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(ARCHIVE_BATCH);

    if (error) throw error;

    const rows = (data || []) as AuditArchiveRow[];
    if (!rows.length) break;

    const archiveResult = await archiveNeonRows("auditoria_logs", rows);
    if (!archiveResult.ok || archiveResult.archived !== rows.length) {
      await recordNeonEvent({
        componentKey: "cron.observability_cleanup",
        eventType: "audit_archive_deferred",
        level: "warning",
        message: "Arquivamento de auditoria adiado; nenhum registro foi removido do Supabase.",
        metadata: {
          expected: rows.length,
          archived: archiveResult.archived,
          batch: batch + 1,
        },
      });
      break;
    }

    const ids = rows.map((row) => row.id);
    const { error: deleteError } = await supabaseAdmin.from("auditoria_logs").delete().in("id", ids);
    if (deleteError) throw deleteError;

    archived += rows.length;
    batches += 1;
    if (rows.length < ARCHIVE_BATCH) break;
  }

  return { archived, batches, cutoff, retentionDays: AUDIT_ARCHIVE_DAYS };
}

async function archiveOldTelemetryRows(input: {
  tableName: "operational_probe_history" | "eventos_cron";
  timestampColumn: "checked_at" | "iniciado_em";
  retentionDays: number;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - input.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  let archived = 0;
  let batches = 0;

  for (let batch = 0; batch < ARCHIVE_MAX_BATCHES; batch += 1) {
    const { data, error } = await (supabaseAdmin as any)
      .from(input.tableName)
      .select("*")
      .lt(input.timestampColumn, cutoff)
      .order(input.timestampColumn, { ascending: true })
      .limit(ARCHIVE_BATCH);

    if (error) throw error;

    const rawRows = (data || []) as Array<Record<string, unknown>>;
    if (!rawRows.length) break;

    const rows = rawRows.map((row) => ({
      ...row,
      id: String(row.id || ""),
      created_at: String(row[input.timestampColumn] || new Date().toISOString()),
    }));

    const archiveResult = await archiveNeonRows(input.tableName, rows);
    if (!archiveResult.ok || archiveResult.archived !== rows.length) {
      await recordNeonEvent({
        componentKey: "cron.observability_cleanup",
        eventType: "telemetry_archive_deferred",
        level: "warning",
        message: `Arquivamento de ${input.tableName} adiado; nenhum registro foi removido do Supabase.`,
        metadata: {
          sourceTable: input.tableName,
          expected: rows.length,
          archived: archiveResult.archived,
          batch: batch + 1,
        },
      });
      break;
    }

    const ids = rows.map((row) => row.id);
    const { error: deleteError } = await (supabaseAdmin as any)
      .from(input.tableName)
      .delete()
      .in("id", ids);
    if (deleteError) throw deleteError;

    archived += rows.length;
    batches += 1;
    if (rows.length < ARCHIVE_BATCH) break;
  }

  return { archived, batches, cutoff, retentionDays: input.retentionDays };
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
    `${summary.summary} ${auditArchive.archived} auditoria(s), ${probeArchive.archived} probe(s) e ${cronArchive.archived} evento(s) de cron arquivados no Neon.`,
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
