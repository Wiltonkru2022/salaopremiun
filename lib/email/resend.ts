import "server-only";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const RESEND_API_URL = "https://api.resend.com/emails";

type TransactionalEmailInput = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  bcc?: string | string[];
  replyTo?: string;
  idempotencyKey?: string;
};

type EmailContact = {
  email: string;
  name?: string;
};

export function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseEmailContact(value: string): EmailContact {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(.*?)\s*<([^<>]+)>$/);

  if (!match) {
    return { email: normalized };
  }

  const name = String(match[1] || "").trim().replace(/^['"]|['"]$/g, "");
  const email = String(match[2] || "").trim();
  return name ? { email, name } : { email };
}

function parseEmailContacts(value?: string | string[]) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => parseEmailContact(item))
    .filter((item) => Boolean(item.email));
}

async function sendBrevoEmail(input: TransactionalEmailInput, apiKey: string) {
  const sender = parseEmailContact(
    process.env.BREVO_EMAIL_FROM?.trim() || input.from
  );
  const to = parseEmailContacts(input.to);
  const bcc = parseEmailContacts(input.bcc);
  const replyTo = input.replyTo ? parseEmailContact(input.replyTo) : undefined;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      to,
      ...(bcc.length ? { bcc } : {}),
      ...(replyTo?.email ? { replyTo } : {}),
      subject: input.subject,
      htmlContent: input.html,
      ...(input.text ? { textContent: input.text } : {}),
      ...(input.idempotencyKey
        ? { headers: { "Idempotency-Key": input.idempotencyKey } }
        : {}),
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    messageId?: string;
    messageIds?: string[];
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new Error(result.message || result.code || "Brevo recusou o envio.");
  }

  return result.messageId || result.messageIds?.[0] || null;
}

async function sendLegacyResendEmail(
  input: TransactionalEmailInput,
  apiKey: string
) {
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

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  if (brevoApiKey) {
    return sendBrevoEmail(input, brevoApiKey);
  }

  // Fallback temporario para permitir rollback sem alterar todos os chamadores.
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    return sendLegacyResendEmail(input, resendApiKey);
  }

  throw new Error("BREVO_API_KEY não configurada.");
}

// Compatibilidade: os chamadores antigos ainda importam sendResendEmail.
export const sendResendEmail = sendTransactionalEmail;
