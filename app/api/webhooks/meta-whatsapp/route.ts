import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";
import {
  getMetaWhatsAppWebhookVerifyToken,
  getMetaWhatsAppAppSecret,
} from "@/lib/whatsapp/meta-config";
import {
  isMetaWebhookSignatureValid,
  isMetaWebhookVerifyRequest,
} from "@/lib/whatsapp/meta-cloud";

type WebhookEvent = {
  kind: "status" | "message";
  providerMessageId: string | null;
  providerStatus: string | null;
  waId: string | null;
  body: Record<string, unknown>;
};

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

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

function extractWebhookEvents(body: Record<string, unknown>) {
  const events: WebhookEvent[] = [];

  for (const entry of asArray(body.entry)) {
    const entryRecord = asRecord(entry);
    if (!entryRecord) continue;

    for (const change of asArray(entryRecord.changes)) {
      const changeRecord = asRecord(change);
      const value = asRecord(changeRecord?.value);
      if (!value) continue;

      for (const status of asArray(value.statuses)) {
        const statusRecord = asRecord(status);
        if (!statusRecord) continue;

        events.push({
          kind: "status",
          providerMessageId:
            String(statusRecord.id || "").trim() || null,
          providerStatus:
            String(statusRecord.status || "").trim() || null,
          waId: String(statusRecord.recipient_id || "").trim() || null,
          body: statusRecord,
        });
      }

      for (const message of asArray(value.messages)) {
        const messageRecord = asRecord(message);
        if (!messageRecord) continue;

        events.push({
          kind: "message",
          providerMessageId:
            String(messageRecord.id || "").trim() || null,
          providerStatus: "recebida",
          waId: String(messageRecord.from || "").trim() || null,
          body: messageRecord,
        });
      }
    }
  }

  return events;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!isMetaWebhookVerifyRequest({ mode, token })) {
    return NextResponse.json(
      { error: "Webhook Meta nao autorizado." },
      { status: 403 }
    );
  }

  return new NextResponse(challenge || getMetaWhatsAppWebhookVerifyToken(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = getMetaWhatsAppAppSecret();

  if (appSecret && !isMetaWebhookSignatureValid(rawBody, signature)) {
    return NextResponse.json(
      { error: "Assinatura do webhook Meta invalida." },
      { status: 401 }
    );
  }

  const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  const supabaseAdmin = getSupabaseAdmin();
  const events = extractWebhookEvents(body);

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
      return NextResponse.json(
        { error: "Erro ao registrar webhook Meta." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
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
          return NextResponse.json(
            { error: "Erro ao atualizar status do envio WhatsApp." },
            { status: 500 }
          );
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
      return NextResponse.json(
        { error: "Erro ao registrar evento do webhook Meta." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
