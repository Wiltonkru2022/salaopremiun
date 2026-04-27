import { NextResponse } from "next/server";
import {
  getMetaWhatsAppWebhookVerifyToken,
  getMetaWhatsAppAppSecret,
} from "@/lib/whatsapp/meta-config";
import {
  isMetaWebhookSignatureValid,
  isMetaWebhookVerifyRequest,
} from "@/lib/whatsapp/meta-cloud";
import { processMetaWhatsAppWebhook } from "@/services/metaWhatsAppWebhookService";

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
  const events = extractWebhookEvents(body);

  try {
    await processMetaWhatsAppWebhook({ body, events });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook Meta.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
