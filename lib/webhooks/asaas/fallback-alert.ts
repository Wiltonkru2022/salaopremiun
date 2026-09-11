import type { SupabaseClient } from "@supabase/supabase-js";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";

export async function registrarFalhaWebhookFallback(params: {
  supabaseAdmin: SupabaseClient;
  webhookPayload: Record<string, unknown>;
  event: string;
  paymentId: string;
  paymentStatus: string | null;
  errorMessage: string;
}) {
  const { data: cobranca } = await params.supabaseAdmin
    .from("assinaturas_cobrancas")
    .select("id, id_salao, id_assinatura")
    .eq("asaas_payment_id", params.paymentId)
    .maybeSingle();

  const idSalao = String(cobranca?.id_salao || "").trim() || null;
  const eventId = String(params.webhookPayload.id || "").trim();
  const chaveEvento = `fallback:asaas:${eventId || params.paymentId}:${params.event}`;

  await reportOperationalIncident({
    supabaseAdmin: params.supabaseAdmin,
    key: chaveEvento,
    module: "webhook_asaas",
    title: "Webhook Asaas falhou antes do registro",
    description: `Falha ao registrar o evento ${params.event || "-"} para o pagamento ${params.paymentId}.`,
    severity: "critica",
    idSalao,
    details: {
      origem_registro: "fallback_webhook_registration_error",
      event_id: eventId || null,
      payment_id: params.paymentId,
      payment_status: params.paymentStatus,
      webhook_payload: params.webhookPayload,
      erro_mensagem: params.errorMessage,
      id_cobranca: cobranca?.id || null,
      id_assinatura: cobranca?.id_assinatura || null,
    },
    webhook: {
      key: chaveEvento,
      origin: "asaas",
      event: params.event || "evento_desconhecido",
      eventStatus: "erro",
      response: {
        status_processamento: "erro_registro_inicial",
        payment_id: params.paymentId,
      },
    },
  });
}
