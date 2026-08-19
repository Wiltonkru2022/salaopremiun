import "server-only";

import { createHash } from "node:crypto";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

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

  if (!match) return { email: normalized };

  const name = String(match[1] || "").trim().replace(/^[\"']|[\"']$/g, "");
  const email = String(match[2] || "").trim();
  return name ? { email, name } : { email };
}

function parseEmailContacts(value?: string | string[]) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map(parseEmailContact)
    .filter((item) => Boolean(item.email));
}

function toIdempotencyUuid(value: string) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  const chars = hex.split("");
  chars[12] = "5";
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

export async function sendBrevoEmail(input: TransactionalEmailInput) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("BREVO_API_KEY não configurada.");

  const sender = parseEmailContact(
    process.env.BREVO_EMAIL_FROM?.trim() || input.from
  );
  const to = parseEmailContacts(input.to);
  const bcc = parseEmailContacts(input.bcc);
  const replyTo = input.replyTo ? parseEmailContact(input.replyTo) : undefined;

  if (!sender.email) throw new Error("Remetente de e-mail não configurado.");
  if (to.length === 0) throw new Error("Destinatário de e-mail não informado.");

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
        ? { headers: { idempotencyKey: toIdempotencyUuid(input.idempotencyKey) } }
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
