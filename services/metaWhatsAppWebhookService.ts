import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

type WebhookEvent = {
  kind: "status" | "message";
  providerMessageId: string | null;
  providerStatus: string | null;
  waId: string | null;
  body: Record<string, unknown>;
};

function mapMetaStatus(status: string | null) {
  switch (String(status || "").trim().toLowerCase()) {
    case "sent":
      return "enviado";
    case "delivered":
      return "entregue";
    case "read":
      return "lido";
    case "failed":
      return "falhou";
    default:
      return String(status || "").trim().toLowerCase() || "recebido";
  }
}

export async function processMetaWhatsAppWebhook(params: {
  body: Record<string, unknown>;
  events: WebhookEvent[];
}) {
  const { body, events } = params;
  const supabaseAdmin = getSupabaseAdmin();

  if (events.length === 0) {
    const { error } = await supabaseAdmin.from("whatsapp_filas").insert({
      id_salao: null,
      payload_json: {
        provider: "meta_cloud",
        kind: "unknown",
        received_at: new Date().toISOString(),
        body,
      } as Json,
      status: "recebido",
      tentativas: 1,
      processado_em: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Erro ao registrar webhook Meta.");
    }

    return;
  }

  for (const event of events) {
    let idSalao: string | null = null;
    let envioId: string | null = null;

    if (event.providerMessageId) {
      const envioLookup = await supabaseAdmin
        .from("whatsapp_envios")
        .select("id, id_salao")
        .eq("provider_message_id", event.providerMessageId)
        .maybeSingle();

      envioId = envioLookup.data?.id || null;
      idSalao = envioLookup.data?.id_salao || null;

      if (event.kind === "status" && envioId) {
        const erroTexto =
          event.providerStatus === "failed" ||
          event.providerStatus === "falhou"
            ? JSON.stringify(event.body).slice(0, 500)
            : null;

        const envioUpdate = await supabaseAdmin
          .from("whatsapp_envios")
          .update({
            status: mapMetaStatus(event.providerStatus),
            erro_texto: erroTexto,
          })
          .eq("id", envioId);

        if (envioUpdate.error) {
          throw new Error("Erro ao atualizar status do envio WhatsApp.");
        }
      }
    }

    const filaInsert = await supabaseAdmin.from("whatsapp_filas").insert({
      id_salao: idSalao,
      payload_json: {
        provider: "meta_cloud",
        kind: event.kind,
        provider_message_id: event.providerMessageId,
        provider_status: event.providerStatus,
        wa_id: event.waId,
        received_at: new Date().toISOString(),
        body: event.body,
      } as Json,
      status: "processado",
      tentativas: 1,
      processado_em: new Date().toISOString(),
    });

    if (filaInsert.error) {
      throw new Error("Erro ao registrar evento do webhook Meta.");
    }
  }
}
