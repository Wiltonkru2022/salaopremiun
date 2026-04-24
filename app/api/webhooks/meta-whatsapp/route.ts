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

  const { error } = await supabaseAdmin.from("whatsapp_filas").insert({
    id_salao: null,
    payload_json: {
      provider: "meta_cloud",
      received_at: new Date().toISOString(),
      body,
    } as Json,
    status: "pendente",
    tentativas: 0,
  });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao registrar webhook Meta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
