import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarLogSistema } from "@/lib/system-logs";

export async function registrarFalhaWebhookFallback(params: {
  supabaseAdmin: SupabaseClient;
  webhookPayload: Record<string, unknown>;
  event: string;
  paymentId: string;
  paymentStatus: string | null;
  errorMessage: string;
}) {
  const agoraIso = new Date().toISOString();

  const { data: cobranca } = await params.supabaseAdmin
    .from("assinaturas_cobrancas")
    .select("id, id_salao, id_assinatura")
    .eq("asaas_payment_id", params.paymentId)
    .maybeSingle();

  const idSalao = String(cobranca?.id_salao || "").trim() || null;
  const eventId = String(params.webhookPayload.id || "").trim();
  const chaveEvento = `fallback:asaas:${eventId || params.paymentId}:${params.event}`;

  await registrarLogSistema({
    gravidade: "error",
    modulo: "webhook_asaas",
    idSalao,
    mensagem: "Falha ao registrar evento inicial do webhook Asaas.",
    detalhes: {
      origem_registro: "fallback_webhook_registration_error",
      event_id: eventId || null,
      event: params.event,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus,
      erro_mensagem: params.errorMessage,
    },
  });

  const payloadFallback = {
    origem_registro: "fallback_webhook_registration_error",
    event_id: eventId || null,
    payment_id: params.paymentId,
    payment_status: params.paymentStatus,
    webhook_payload: params.webhookPayload,
  };

  await params.supabaseAdmin.from("eventos_webhook").upsert(
    {
      chave: chaveEvento,
      origem: "asaas",
      evento: params.event || "evento_desconhecido",
      id_salao: idSalao,
      status: "erro",
      payload_json: payloadFallback,
      resposta_json: {
        status_processamento: "erro_registro_inicial",
        payment_id: params.paymentId,
      },
      erro_texto: params.errorMessage,
      tentativas: 1,
      recebido_em: agoraIso,
      processado_em: null,
      automatico: true,
      atualizado_em: agoraIso,
    },
    { onConflict: "chave" }
  );

  await params.supabaseAdmin.from("alertas_sistema").upsert(
    {
      chave: `alerta:${chaveEvento}`,
      tipo: "webhook_asaas_erro",
      gravidade: "critica",
      origem_modulo: "webhooks",
      id_salao: idSalao,
      titulo: "Webhook Asaas falhou antes do registro",
      descricao: `Falha ao registrar o evento ${params.event || "-"} para o pagamento ${params.paymentId}.`,
      payload_json: {
        ...payloadFallback,
        id_cobranca: cobranca?.id || null,
        id_assinatura: cobranca?.id_assinatura || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: agoraIso,
    },
    { onConflict: "chave" }
  );
}
