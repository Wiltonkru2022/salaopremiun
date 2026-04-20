import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarLogSistema } from "@/lib/system-logs";

type OperationalAlertSeverity = "baixa" | "media" | "alta" | "critica";

type WebhookIncidentPayload = {
  key: string;
  origin: string;
  event: string;
  eventStatus: string;
  response?: Record<string, unknown>;
};

type OperationalIncidentParams = {
  supabaseAdmin: SupabaseClient;
  key: string;
  module: string;
  title: string;
  description: string;
  severity?: OperationalAlertSeverity;
  idSalao?: string | null;
  details?: Record<string, unknown>;
  webhook?: WebhookIncidentPayload;
};

function sanitizeDetails(value?: Record<string, unknown>) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(Object.entries(value).slice(0, 40));
}

function mapLogSeverity(severity: OperationalAlertSeverity) {
  if (severity === "critica" || severity === "alta") return "error";
  if (severity === "media") return "warning";
  return "info";
}

export async function reportOperationalIncident(
  params: OperationalIncidentParams
) {
  const agoraIso = new Date().toISOString();
  const severity = params.severity || "alta";
  const details = sanitizeDetails(params.details);

  await registrarLogSistema({
    gravidade: mapLogSeverity(severity),
    modulo: params.module,
    idSalao: params.idSalao || null,
    mensagem: params.title,
    detalhes: {
      descricao: params.description,
      ...details,
    },
  });

  await params.supabaseAdmin.from("alertas_sistema").upsert(
    {
      chave: `alerta:${params.key}`,
      tipo: `${params.module}_erro`,
      gravidade: severity,
      origem_modulo: params.module,
      id_salao: params.idSalao || null,
      titulo: params.title,
      descricao: params.description,
      payload_json: details,
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: agoraIso,
    },
    { onConflict: "chave" }
  );

  if (!params.webhook) {
    return;
  }

  await params.supabaseAdmin.from("eventos_webhook").upsert(
    {
      chave: params.webhook.key,
      origem: params.webhook.origin,
      evento: params.webhook.event,
      id_salao: params.idSalao || null,
      status: params.webhook.eventStatus,
      payload_json: details,
      resposta_json: params.webhook.response || null,
      erro_texto: params.description,
      tentativas: 1,
      recebido_em: agoraIso,
      processado_em: null,
      automatico: true,
      atualizado_em: agoraIso,
    },
    { onConflict: "chave" }
  );
}
