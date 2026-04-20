const DEFAULT_BASE_DOMAIN = "salaopremiun.com.br";

function sanitizeDomain(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function normalizeHost(value?: string | null) {
  return sanitizeDomain(value);
}

export function isLocalHost(host?: string | null) {
  const normalized = normalizeHost(host);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  );
}

export const APP_BASE_DOMAIN =
  sanitizeDomain(process.env.APP_BASE_DOMAIN) || DEFAULT_BASE_DOMAIN;

export const APP_COOKIE_DOMAIN = `.${APP_BASE_DOMAIN}`;

export const DOMINIO_RAIZ =
  sanitizeDomain(process.env.APP_ROOT_HOST) || APP_BASE_DOMAIN;
export const DOMINIO_WWW =
  sanitizeDomain(process.env.APP_WWW_HOST) || `www.${APP_BASE_DOMAIN}`;
export const DOMINIO_PAINEL =
  sanitizeDomain(process.env.APP_PAINEL_HOST) || `painel.${APP_BASE_DOMAIN}`;
export const DOMINIO_APP =
  sanitizeDomain(process.env.APP_PROFISSIONAL_HOST) || `app.${APP_BASE_DOMAIN}`;
export const DOMINIO_LOGIN =
  sanitizeDomain(process.env.APP_LOGIN_HOST) || `login.${APP_BASE_DOMAIN}`;
export const DOMINIO_CADASTRO =
  sanitizeDomain(process.env.APP_CADASTRO_HOST) || `cadastro.${APP_BASE_DOMAIN}`;
export const DOMINIO_ASSINATURA =
  sanitizeDomain(process.env.APP_ASSINATURA_HOST) || `assinatura.${APP_BASE_DOMAIN}`;

export const DOMINIOS_GERENCIADOS = [
  DOMINIO_RAIZ,
  DOMINIO_WWW,
  DOMINIO_PAINEL,
  DOMINIO_APP,
  DOMINIO_LOGIN,
  DOMINIO_CADASTRO,
  DOMINIO_ASSINATURA,
];

export function isManagedAppHost(host?: string | null) {
  const normalized = normalizeHost(host);
  return (
    normalized === APP_BASE_DOMAIN ||
    normalized.endsWith(APP_COOKIE_DOMAIN) ||
    DOMINIOS_GERENCIADOS.includes(normalized)
  );
}

export function getPublicWebhookUrl() {
  return `https://${DOMINIO_RAIZ}/api/webhooks/asaas`;
}
