import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";

export function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendResendEmail(input: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  bcc?: string | string[];
  replyTo?: string;
  idempotencyKey?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      text: input.text,
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

  return result.id || null;
}
