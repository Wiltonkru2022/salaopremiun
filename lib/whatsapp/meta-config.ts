function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

export function getMetaWhatsAppAccessToken() {
  const value = firstEnv(
    "META_WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_CLOUD_ACCESS_TOKEN"
  );
  if (!value) {
    throw new Error(
      "Token WhatsApp Meta nao configurado (META_WHATSAPP_ACCESS_TOKEN ou WHATSAPP_CLOUD_ACCESS_TOKEN)."
    );
  }
  return value;
}

export function getMetaWhatsAppPhoneNumberId() {
  const value = firstEnv(
    "META_WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_CLOUD_PHONE_NUMBER_ID"
  );
  if (!value) {
    throw new Error(
      "Phone Number ID WhatsApp nao configurado (META_WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_CLOUD_PHONE_NUMBER_ID)."
    );
  }
  return value;
}

export function getMetaWhatsAppWabaId() {
  const value = firstEnv(
    "META_WHATSAPP_WABA_ID",
    "META_WHATSAPP_BUSINESS_ACCOUNT_ID",
    "WHATSAPP_BUSINESS_ACCOUNT_ID"
  );
  if (!value) {
    throw new Error(
      "WhatsApp Business Account ID nao configurado (META_WHATSAPP_WABA_ID ou META_WHATSAPP_BUSINESS_ACCOUNT_ID)."
    );
  }
  return value;
}

export function getMetaWhatsAppApiVersion() {
  return firstEnv(
    "META_WHATSAPP_API_VERSION",
    "WHATSAPP_GRAPH_API_VERSION"
  ) || "v23.0";
}

export function getMetaWhatsAppWebhookVerifyToken() {
  const value = firstEnv(
    "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
  );
  if (!value) {
    throw new Error(
      "Webhook verify token WhatsApp nao configurado (META_WHATSAPP_WEBHOOK_VERIFY_TOKEN ou WHATSAPP_WEBHOOK_VERIFY_TOKEN)."
    );
  }
  return value;
}

export function getMetaWhatsAppAppSecret() {
  return firstEnv(
    "META_WHATSAPP_APP_SECRET",
    "WHATSAPP_META_APP_SECRET"
  ) || null;
}

export function buildMetaWhatsAppApiBaseUrl() {
  return `https://graph.facebook.com/${getMetaWhatsAppApiVersion()}`;
}
