import { listarAssinantesNewsletterBlog } from "@/services/blogRouteService";

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

export async function enviarNewsletterPostPublicado(input: {
  slug?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  resumo?: string | null;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY nao configurada.");
  }

  const subscribers = await listarAssinantesNewsletterBlog();

  if (subscribers.length === 0) {
    return { sent: 0, batches: 0 };
  }

  const blogBaseUrl =
    process.env.BLOG_PUBLIC_URL || "https://blog.salaopremiun.com.br";
  const postUrl = `${blogBaseUrl.replace(/\/$/, "")}/${input.slug || ""}`;
  const title = input.titulo || "Novo post no Blog SalaoPremium";
  const summary = input.resumo || input.descricao || "Tem artigo novo no blog.";
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

  return {
    sent: subscribers.length,
    batches: emailIds.length,
  };
}
