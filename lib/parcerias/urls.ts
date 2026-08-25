export function normalizeExternalDestination(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("/")) return raw;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;

  // Reject executable/unknown schemes such as javascript: and data:.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;

  if (/^(wa\.me|api\.whatsapp\.com|www\.)\//i.test(raw)) {
    return `https://${raw}`;
  }

  if (/^(wa\.me|api\.whatsapp\.com|www\.)/i.test(raw)) {
    return `https://${raw}`;
  }

  if (/^[^\s/]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw)) {
    return `https://${raw}`;
  }

  return null;
}

export function buildPartnerWhatsAppUrl(phoneValue: unknown, companyName?: unknown) {
  const digits = String(phoneValue ?? "").replace(/\D/g, "");
  if (!digits) return null;

  const international = digits.startsWith("55") ? digits : `55${digits}`;
  if (international.length < 12 || international.length > 13) return null;

  const company = String(companyName ?? "").trim();
  const greeting = company ? `Olá, equipe ${company}!` : "Olá!";
  const message = `${greeting} Somos do Salão Premium e estamos abertos para uma parceria de divulgação em nossa plataforma. Se tiver interesse, posso apresentar nossos serviços e possibilidades de parceria.`;

  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
