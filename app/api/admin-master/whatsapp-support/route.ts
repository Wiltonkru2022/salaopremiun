import { NextRequest, NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function db() {
  return getSupabaseAdmin() as any;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const access = await getAdminMasterAccess("whatsapp_ver");
  if (!access.ok) return jsonError(access.message, access.status);

  const conversationId = request.nextUrl.searchParams.get("conversationId");

  if (conversationId) {
    const { data, error } = await db()
      .from("whatsapp_support_messages")
      .select("id, conversa_id, wamid, direcao, tipo, conteudo, status, criado_em")
      .eq("conversa_id", conversationId)
      .order("criado_em", { ascending: false })
      .limit(80);

    if (error) return jsonError("Erro ao carregar mensagens.", 500);
    return NextResponse.json({ ok: true, messages: (data || []).reverse() });
  }

  const { data, error } = await db()
    .from("whatsapp_support_conversations")
    .select("id, wa_id, telefone, nome_contato, status, nao_lidas, ultima_mensagem_em, ultima_mensagem_preview")
    .order("ultima_mensagem_em", { ascending: false })
    .limit(30);

  if (error) return jsonError("Erro ao carregar conversas.", 500);
  return NextResponse.json({ ok: true, conversations: data || [] });
}

export async function POST(request: NextRequest) {
  const access = await getAdminMasterAccess("whatsapp_editar");
  if (!access.ok) return jsonError(access.message, access.status);

  const body = await request.json().catch(() => ({}));
  const conversationId = String(body?.conversationId || "").trim();
  const action = String(body?.action || "send");
  if (!conversationId) return jsonError("Conversa invalida.");

  if (action === "mark_read") {
    const { error } = await db()
      .from("whatsapp_support_conversations")
      .update({ nao_lidas: 0, atualizado_em: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) return jsonError("Erro ao marcar conversa como lida.", 500);
    return NextResponse.json({ ok: true });
  }

  if (action === "status") {
    const status = String(body?.status || "");
    if (!["aberta", "pendente", "encerrada"].includes(status)) {
      return jsonError("Status invalido.");
    }
    const { error } = await db()
      .from("whatsapp_support_conversations")
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) return jsonError("Erro ao alterar status.", 500);
    return NextResponse.json({ ok: true });
  }

  const text = String(body?.text || "").trim().slice(0, 4096);
  if (!text) return jsonError("Digite uma mensagem.");

  const { data: conversation, error: conversationError } = await db()
    .from("whatsapp_support_conversations")
    .select("id, wa_id")
    .eq("id", conversationId)
    .single();
  if (conversationError || !conversation) return jsonError("Conversa nao encontrada.", 404);

  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  if (!token || !phoneNumberId) {
    return jsonError("WhatsApp Cloud API ainda nao configurada no servidor.", 503);
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: conversation.wa_id,
        type: "text",
        text: { preview_url: false, body: text },
      }),
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || "Falha ao enviar mensagem pelo WhatsApp.";
    return jsonError(detail, 502);
  }

  const wamid = String(payload?.messages?.[0]?.id || "") || null;
  const now = new Date().toISOString();
  const { error: insertError } = await db().from("whatsapp_support_messages").insert({
    conversa_id: conversationId,
    wamid,
    direcao: "saida",
    tipo: "text",
    conteudo: text,
    status: "enviada",
    criado_em: now,
  });
  if (insertError) return jsonError("Mensagem enviada, mas falhou ao registrar o historico.", 500);

  await db()
    .from("whatsapp_support_conversations")
    .update({
      ultima_mensagem_em: now,
      ultima_mensagem_preview: text.slice(0, 240),
      atualizado_em: now,
      status: "aberta",
    })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true, wamid });
}
