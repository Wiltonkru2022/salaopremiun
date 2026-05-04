import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
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

async function handleCron(req: Request) {
  const authorized = verifyBearerSecret(
    req.headers.get("authorization"),
    process.env.CRON_SECRET
  );

  if (!authorized) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  let cronId: string | null = null;

  try {
    cronId = await registrarInicioCron();
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc(
      "fn_observability_retention_cleanup",
      {
        p_eventos_sistema_days:
          OBSERVABILITY_RETENTION_DEFAULTS.eventosSistemaDays,
        p_logs_sistema_days: OBSERVABILITY_RETENTION_DEFAULTS.logsSistemaDays,
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

    return NextResponse.json({
      ok: true,
      route: CRON_ROUTE,
      totalRemovido: summary.total,
      tabelas: summary.detail,
      retention: OBSERVABILITY_RETENTION_DEFAULTS,
      resumo: summary.summary,
    });
  } catch (error) {
    if (cronId) {
      await atualizarCron({
        id: cronId,
        status: "erro",
        resumo: "Falha ao limpar observabilidade.",
        erroTexto: error instanceof Error ? error.message : "Erro desconhecido.",
        payload: {
          route: CRON_ROUTE,
          retention: OBSERVABILITY_RETENTION_DEFAULTS,
        } as Json,
      });
    }

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

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao limpar observabilidade.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
