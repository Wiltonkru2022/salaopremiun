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

async function registrarInicioCron() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("eventos_cron")
    .insert({
      nome: CRON_NAME,
      status: "executando",
      resumo: "Iniciando limpeza de observabilidade.",
      payload_json: {
        route: CRON_ROUTE,
        retention: OBSERVABILITY_RETENTION_DEFAULTS,
      } as Json,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function atualizarCron(params: {
  id: string;
  status: string;
  resumo: string;
  payload?: Json;
  erroTexto?: string | null;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin
    .from("eventos_cron")
    .update({
      status: params.status,
      resumo: params.resumo,
      payload_json: params.payload || {},
      erro_texto: params.erroTexto || null,
      finalizado_em: new Date().toISOString(),
    })
    .eq("id", params.id);
}

export async function limparObservabilidade() {
  const cronId = await registrarInicioCron();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc(
    "fn_observability_retention_cleanup",
    {
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
    }
  );

  if (error) {
    throw error;
  }

  const rows = (data || []) as ObservabilityCleanupRow[];
  const summary = formatObservabilityCleanupSummary(rows);

  await atualizarCron({
    id: cronId,
    status: "sucesso",
    resumo: summary.summary,
    payload: {
      route: CRON_ROUTE,
      totalRemovido: summary.total,
      tabelas: summary.detail,
      retention: OBSERVABILITY_RETENTION_DEFAULTS,
    } as Json,
  });

  return {
    route: CRON_ROUTE,
    totalRemovido: summary.total,
    tabelas: summary.detail,
    retention: OBSERVABILITY_RETENTION_DEFAULTS,
    resumo: summary.summary,
  };
}

export async function registrarFalhaLimpezaObservabilidade(error: unknown) {
  try {
    await reportOperationalIncident({
      supabaseAdmin: getSupabaseAdmin(),
      key: "cron:limpar-observabilidade:erro",
      module: "cron_observabilidade",
      title: "Cron de limpeza de observabilidade falhou",
      description:
        error instanceof Error
          ? error.message
          : "Erro ao limpar eventos antigos do sistema.",
      severity: "alta",
      details: {
        route: CRON_ROUTE,
      },
    });
  } catch {
    // No-op: a falha principal ja sera devolvida no cron.
  }
}
