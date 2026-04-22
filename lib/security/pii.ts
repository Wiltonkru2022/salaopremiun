const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4})-?\d{4}\b/g;
const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function redactEmail(value: string) {
  return value.replace(EMAIL_REGEX, "[email_redigido]");
}

export function redactPhone(value: string) {
  return value.replace(PHONE_REGEX, "[telefone_redigido]");
}

export function redactCpf(value: string) {
  return value.replace(CPF_REGEX, "[cpf_redigido]");
}

export function redactPII(value: string) {
  return normalizeSpaces(
    redactCpf(redactPhone(redactEmail(String(value || ""))))
  );
}

export function sanitizeFreeText(value: unknown, max = 200) {
  return redactPII(String(value || "")).slice(0, max);
}

export function firstNameOnly(value: unknown) {
  const text = sanitizeFreeText(value, 80);
  if (!text) return null;
  return text.split(" ")[0] || null;
}

export function buildSafeClienteContext(cliente: {
  id?: string | null;
  nome?: string | null;
} | null) {
  if (!cliente?.id) return null;

  return {
    id: cliente.id,
    nome: firstNameOnly(cliente.nome),
  };
}

export function buildSafePromptJson(data: unknown) {
  return JSON.stringify(data, null, 2);
}
