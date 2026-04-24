export function getMetaWhatsAppAccessToken() {
  const value = process.env.META_WHATSAPP_ACCESS_TOKEN;
  if (!value) {
    throw new Error("META_WHATSAPP_ACCESS_TOKEN nao configurado.");
  }
  return value;
}

export function getMetaWhatsAppPhoneNumberId() {
  const value = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!value) {
    throw new Error("META_WHATSAPP_PHONE_NUMBER_ID nao configurado.");
  }
  return value;
}

export function getMetaWhatsAppWabaId() {
  const value = process.env.META_WHATSAPP_WABA_ID;
  if (!value) {
    throw new Error("META_WHATSAPP_WABA_ID nao configurado.");
  }
  return value;
}

export function getMetaWhatsAppApiVersion() {
  return process.env.META_WHATSAPP_API_VERSION || "v23.0";
}

export function getMetaWhatsAppWebhookVerifyToken() {
  const value = process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!value) {
    throw new Error("META_WHATSAPP_WEBHOOK_VERIFY_TOKEN nao configurado.");
  }
  return value;
}

export function getMetaWhatsAppAppSecret() {
  return process.env.META_WHATSAPP_APP_SECRET || null;
}

export function buildMetaWhatsAppApiBaseUrl() {
  return `https://graph.facebook.com/${getMetaWhatsAppApiVersion()}`;
}
