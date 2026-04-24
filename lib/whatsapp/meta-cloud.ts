import crypto from "node:crypto";
import {
  buildMetaWhatsAppApiBaseUrl,
  getMetaWhatsAppAccessToken,
  getMetaWhatsAppAppSecret,
  getMetaWhatsAppPhoneNumberId,
  getMetaWhatsAppWebhookVerifyToken,
} from "@/lib/whatsapp/meta-config";

type MetaSendTextParams = {
  to: string;
  body: string;
  previewUrl?: boolean;
};

function onlyNumbers(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBrazilMsisdn(value?: string | null) {
  let digits = onlyNumbers(value);

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

export function isMetaWebhookVerifyRequest(params: {
  mode?: string | null;
  token?: string | null;
}) {
  return (
    String(params.mode || "").trim() === "subscribe" &&
    String(params.token || "").trim() === getMetaWhatsAppWebhookVerifyToken()
  );
}

export function isMetaWebhookSignatureValid(rawBody: string, signature?: string | null) {
  const appSecret = getMetaWhatsAppAppSecret();

  if (!appSecret) {
    return true;
  }

  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const provided = signature.replace(/^sha256=/, "");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(provided, "hex")
  );
}

export async function sendMetaWhatsAppTextMessage(params: MetaSendTextParams) {
  const phoneNumberId = getMetaWhatsAppPhoneNumberId();
  const accessToken = getMetaWhatsAppAccessToken();
  const url = `${buildMetaWhatsAppApiBaseUrl()}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizeBrazilMsisdn(params.to),
      type: "text",
      text: {
        preview_url: Boolean(params.previewUrl),
        body: String(params.body || "").trim(),
      },
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      typeof data.error === "object" && data.error
        ? String((data.error as Record<string, unknown>).message || "Erro Meta WhatsApp.")
        : String(data.message || "Erro Meta WhatsApp.");

    throw new Error(message);
  }

  return data;
}
