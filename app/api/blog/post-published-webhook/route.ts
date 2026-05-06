import { NextResponse } from "next/server";
import { getBlogSupabaseAdmin } from "@/lib/blog/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BlogPostWebhookRecord = {
  id?: string;
  slug?: string;
  titulo?: string;
  descricao?: string;
  resumo?: string | null;
  status?: string;
};

type BlogPostWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  record?: BlogPostWebhookRecord | null;
  old_record?: BlogPostWebhookRecord | null;
};

type NewsletterSubscriber = {
  email: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_BCC_PER_EMAIL = 50;

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function shouldNotify(payload: BlogPostWebhookPayload) {
  const record = payload.record;
  if (!record || payload.table !== "blog_posts") return false;
  if (record.status !== "publicado") return false;
  if (payload.type === "INSERT") return true;

  return payload.type === "UPDATE" && payload.old_record?.status !== "publicado";
}

async function sendResendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  bcc: string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new Error(result.message || result.name || "Resend recusou o envio.");
  }

  return result.id;
}

export async function POST(request: Request) {
  const configuredSecret = process.env.BLOG_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-blog-webhook-secret");

  if (!configuredSecret || receivedSecret !== configuredSecret) {
    return NextResponse.json({ message: "Webhook nao autorizado." }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { message: "RESEND_API_KEY nao configurada." },
      { status: 500 }
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | BlogPostWebhookPayload
    | null;

  if (!payload || !shouldNotify(payload)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const record = payload.record as BlogPostWebhookRecord;
  const supabase = getBlogSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("origem", "blog")
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const subscribers = ((data || []) as NewsletterSubscriber[])
    .map((subscriber) => subscriber.email.trim().toLowerCase())
    .filter(Boolean);

  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const blogBaseUrl =
    process.env.BLOG_PUBLIC_URL || "https://blog.salaopremiun.com.br";
  const postUrl = `${blogBaseUrl.replace(/\/$/, "")}/${record.slug}`;
  const title = record.titulo || "Novo post no Blog SalaoPremium";
  const summary = record.resumo || record.descricao || "Tem artigo novo no blog.";
  const from =
    process.env.BLOG_EMAIL_FROM ||
    "Blog SalaoPremium <novidades@salaopremiun.com.br>";
  const to = process.env.BLOG_EMAIL_AUDIENCE_TO || "novidades@salaopremiun.com.br";
  const replyTo = process.env.BLOG_EMAIL_REPLY_TO || undefined;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
        <div style="padding:28px 28px 10px">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b">Blog SalaoPremium</p>
          <h1 style="margin:0;font-size:30px;line-height:1.15;color:#0f172a">${htmlEscape(title)}</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569">${htmlEscape(summary)}</p>
          <a href="${htmlEscape(postUrl)}" style="display:inline-block;margin-top:24px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:14px;font-weight:800">Ler artigo</a>
        </div>
        <div style="padding:20px 28px 28px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">Voce recebeu este aviso porque se cadastrou na newsletter do Blog SalaoPremium.</p>
        </div>
      </div>
    </div>
  `;

  const emailIds: string[] = [];
  for (const emails of chunk(subscribers, MAX_BCC_PER_EMAIL)) {
    const emailId = await sendResendEmail({
      apiKey: resendApiKey,
      from,
      to,
      bcc: emails,
      subject: `Novo post: ${title}`,
      html,
      replyTo,
    });

    if (emailId) emailIds.push(emailId);
  }

  return NextResponse.json({
    ok: true,
    sent: subscribers.length,
    batches: emailIds.length,
  });
}
