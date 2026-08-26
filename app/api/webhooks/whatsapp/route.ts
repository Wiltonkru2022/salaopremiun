import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  return getDatabaseAdmin() as any;
}

function validSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.WHATSAPP_META_APP_SECRET;
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && challenge && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function messageText(message: any) {
  const type = String(message?.type || "unknown");
  if (type === "text") return String(message?.text?.body || "");
  if (type === "button") return String(message?.button?.text || "[botao]");
  if (type === "interactive") return String(message?.interactive?.button_reply?.title || message?.interactive?.list_reply?.title || "[interativo]");
  if (type === "image") return String(message?.image?.caption || "[imagem]");
  if (type === "document") return String(message?.document?.caption || message?.document?.filename || "[documento]");
  if (type === "audio") return "[audio]";
  if (type === "video") return String(message?.video?.caption || "[video]");
  if (type === "sticker") return "[figurinha]";
  if (type === "location") return "[localizacao]";
  if (type === "contacts") return "[contato]";
  return `[${type}]`;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  const payload = JSON.parse(rawBody || "{}");
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
      for (const message of messages) {
        const waId = String(message?.from || contacts?.[0]?.wa_id || "").replace(/\D/g, "");
        if (!waId) continue;
        const name = String(contacts?.[0]?.profile?.name || "").trim();
        const timestampSeconds = Number(message?.timestamp || 0);
        const createdAt = timestampSeconds > 0 ? new Date(timestampSeconds * 1000).toISOString() : new Date().toISOString();
        const type = String(message?.type || "unknown").slice(0, 32);
        const content = messageText(message).slice(0, 4096);
        await db().rpc("ingest_whatsapp_support_message", {
          p_wa_id: waId,
          p_telefone: waId,
          p_nome_contato: name || null,
          p_wamid: String(message?.id || "") || null,
          p_tipo: type,
          p_conteudo: content,
          p_criado_em: createdAt,
        });
      }
      for (const status of statuses) {
        const wamid = String(status?.id || "");
        if (!wamid) continue;
        await db().from("whatsapp_support_messages").update({ status: String(status?.status || "atualizada").slice(0, 32) }).eq("wamid", wamid);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
