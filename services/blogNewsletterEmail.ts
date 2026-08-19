import { htmlEscape, sendBrevoEmail } from "@/lib/email/brevo";
import { listarAssinantesNewsletterBlog } from "@/services/blogRouteService";

const MAX_BCC_PER_EMAIL = 50;

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function enviarNewsletterPostPublicado(input: {
  slug?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  resumo?: string | null;
}) {
  const subscribers = await listarAssinantesNewsletterBlog();

  if (subscribers.length === 0) {
    return { sent: 0, batches: 0 };
  }

  const blogBaseUrl =
    process.env.BLOG_PUBLIC_URL || "https://blog.salaopremiun.com.br";
  const postUrl = `${blogBaseUrl.replace(/\/$/, "")}/${input.slug || ""}`;
  const title = input.titulo || "Novo post no Blog SalãoPremium";
  const summary = input.resumo || input.descricao || "Tem artigo novo no blog.";
  const from =
    process.env.BLOG_EMAIL_FROM ||
    "Blog SalãoPremium <novidades@salaopremiun.com.br>";
  const to = process.env.BLOG_EMAIL_AUDIENCE_TO || "novidades@salaopremiun.com.br";
  const replyTo = process.env.BLOG_EMAIL_REPLY_TO || undefined;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
        <div style="padding:28px 28px 10px">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b">Blog SalãoPremium</p>
          <h1 style="margin:0;font-size:30px;line-height:1.15;color:#0f172a">${htmlEscape(title)}</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569">${htmlEscape(summary)}</p>
          <a href="${htmlEscape(postUrl)}" style="display:inline-block;margin-top:24px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:14px;font-weight:800">Ler artigo</a>
        </div>
        <div style="padding:20px 28px 28px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">Você recebeu este aviso porque se cadastrou na newsletter do Blog SalãoPremium.</p>
        </div>
      </div>
    </div>
  `;

  const emailIds: string[] = [];
  for (const emails of chunk(subscribers, MAX_BCC_PER_EMAIL)) {
    const emailId = await sendBrevoEmail({
      from,
      to,
      bcc: emails,
      subject: `Novo post: ${title}`,
      html,
      replyTo,
      idempotencyKey: `blog-newsletter-${input.slug || "post"}-${emails.join("|")}`,
    });

    if (emailId) emailIds.push(emailId);
  }

  return {
    sent: subscribers.length,
    batches: emailIds.length,
  };
}
