import { NextResponse } from "next/server";
import { enviarNewsletterPostPublicado } from "@/services/blogNewsletterEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BlogPostWebhookRecord = {
  id?: string;
  slug?: string;
  titulo?: string;
  descricao?: string;
  resumo?: string | null;
  status?: string;
  enviar_email_newsletter?: boolean;
  notificar_newsletter?: boolean;
};

type BlogPostWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  record?: BlogPostWebhookRecord | null;
  old_record?: BlogPostWebhookRecord | null;
};

function shouldNotify(payload: BlogPostWebhookPayload) {
  const record = payload.record;
  if (!record || payload.table !== "blog_posts") return false;
  if (record.status !== "publicado") return false;
  if (!record.enviar_email_newsletter && !record.notificar_newsletter) {
    return false;
  }
  if (payload.type === "INSERT") return true;

  return payload.type === "UPDATE" && payload.old_record?.status !== "publicado";
}

export async function POST(request: Request) {
  const configuredSecret = process.env.BLOG_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-blog-webhook-secret");

  if (!configuredSecret || receivedSecret !== configuredSecret) {
    return NextResponse.json({ message: "Webhook nao autorizado." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | BlogPostWebhookPayload
    | null;

  if (!payload || !shouldNotify(payload)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const record = payload.record as BlogPostWebhookRecord;
  const result = await enviarNewsletterPostPublicado(record);

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    batches: result.batches,
  });
}
