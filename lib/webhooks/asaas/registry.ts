import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebhookEventOrder } from "@/lib/webhooks/asaas/status";
import type {
  WebhookEventoExistenteRow,
  WebhookRegistroRow,
} from "@/lib/webhooks/asaas/types";

export function buildWebhookFingerprint(
  event: string,
  payment: Record<string, unknown>
) {
  const fingerprintSource = JSON.stringify({
    event,
    paymentId: String(payment.id || ""),
    status: String(payment.status || ""),
    billingType: String(payment.billingType || ""),
    confirmedDate: String(payment.confirmedDate || ""),
    paymentDate: String(payment.paymentDate || ""),
    clientPaymentDate: String(payment.clientPaymentDate || ""),
    dueDate: String(payment.dueDate || ""),
    deleted: Boolean(payment.deleted),
    value: String(payment.value || ""),
  });

  return createHash("sha256").update(fingerprintSource).digest("hex");
}

function buildWebhookIdempotencyKey(
  body: Record<string, unknown>,
  event: string,
  paymentId: string,
  fingerprint: string
) {
  return String(body.id || "").trim() || `${paymentId}:${event}` || fingerprint;
}

async function buscarEventoWebhookExistente(
  supabaseAdmin: SupabaseClient,
  fingerprint: string,
  idempotenciaKey: string
) {
  const { data: porFingerprint, error: fingerprintError } = await supabaseAdmin
    .from("asaas_webhook_eventos")
    .select(
      "id, status_processamento, tentativas, erro_mensagem, processado_em"
    )
    .eq("fingerprint", fingerprint)
    .maybeSingle<WebhookEventoExistenteRow>();

  if (fingerprintError) throw fingerprintError;
  if (porFingerprint?.id) return porFingerprint;

  const { data: porIdempotencia, error: idempotenciaError } =
    await supabaseAdmin
      .from("asaas_webhook_eventos")
      .select(
        "id, status_processamento, tentativas, erro_mensagem, processado_em"
      )
      .eq("idempotencia_key", idempotenciaKey)
      .maybeSingle<WebhookEventoExistenteRow>();

  if (idempotenciaError) throw idempotenciaError;

  return porIdempotencia;
}

export async function registrarEventoWebhookAsaas(params: {
  supabaseAdmin: SupabaseClient;
  fingerprint: string;
  body: Record<string, unknown>;
  event: string;
  paymentId: string;
  paymentStatus: string;
}) {
  const agoraIso = new Date().toISOString();
  const idempotenciaKey = buildWebhookIdempotencyKey(
    params.body,
    params.event,
    params.paymentId,
    params.fingerprint
  );
  const eventOrder = getWebhookEventOrder(params.event, params.paymentStatus);

  const { data: inserted, error: insertError } = await params.supabaseAdmin
    .from("asaas_webhook_eventos")
    .insert({
      fingerprint: params.fingerprint,
      idempotencia_key: idempotenciaKey,
      event_type: params.event,
      evento: params.event,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus || null,
      status_processamento: "processando",
      tentativas: 1,
      payload: params.body,
      erro_mensagem: null,
      primeiro_recebido_em: agoraIso,
      ultimo_recebido_em: agoraIso,
      updated_at: agoraIso,
      event_order: eventOrder,
    })
    .select("id, status_processamento, tentativas")
    .single();

  if (!insertError && inserted?.id) {
    return {
      id: inserted.id,
      should_process: true,
      status_processamento: inserted.status_processamento || "processando",
      tentativas: Number(inserted.tentativas || 1),
    } satisfies WebhookRegistroRow;
  }

  if (insertError?.code !== "23505") throw insertError;

  const existente = await buscarEventoWebhookExistente(
    params.supabaseAdmin,
    params.fingerprint,
    idempotenciaKey
  );

  if (!existente?.id) throw insertError;

  const statusAnterior = String(existente.status_processamento || "processando");
  const tentativasAtualizadas = Number(existente.tentativas || 0) + 1;

  const { data: updated, error: updateError } = await params.supabaseAdmin
    .from("asaas_webhook_eventos")
    .update({
      fingerprint: params.fingerprint,
      idempotencia_key: idempotenciaKey,
      event_type: params.event,
      evento: params.event,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus || null,
      payload: params.body,
      tentativas: tentativasAtualizadas,
      ultimo_recebido_em: agoraIso,
      updated_at: agoraIso,
      event_order: eventOrder,
      status_processamento:
        statusAnterior === "erro" ? "processando" : statusAnterior,
      erro_mensagem:
        statusAnterior === "erro" ? null : existente.erro_mensagem || null,
      processado_em:
        statusAnterior === "erro" ? null : existente.processado_em || null,
    })
    .eq("id", existente.id)
    .select("id, status_processamento, tentativas")
    .single();

  if (updateError || !updated?.id) {
    throw updateError || new Error("Erro ao atualizar evento duplicado do webhook.");
  }

  return {
    id: updated.id,
    should_process: statusAnterior === "erro",
    status_processamento: updated.status_processamento || statusAnterior,
    tentativas: Number(updated.tentativas || tentativasAtualizadas),
  } satisfies WebhookRegistroRow;
}

export async function atualizarStatusEventoWebhook(
  supabaseAdmin: SupabaseClient,
  webhookEventId: string | null,
  statusProcessamento: "processado" | "erro",
  errorMessage?: string | null,
  extra?: Record<string, unknown>
) {
  if (!webhookEventId) return;

  const agoraIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status_processamento: statusProcessamento,
    erro_mensagem: errorMessage || null,
    updated_at: agoraIso,
  };

  if (statusProcessamento === "processado") {
    payload.processado_em = agoraIso;
  }

  Object.assign(payload, extra || {});

  const { error } = await supabaseAdmin
    .from("asaas_webhook_eventos")
    .update(payload)
    .eq("id", webhookEventId);

  if (error) {
    console.error("Erro ao atualizar log do webhook Asaas:", error);
  }
}
