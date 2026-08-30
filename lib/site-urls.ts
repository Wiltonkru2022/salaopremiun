import {
  DOMINIO_APP,
  DOMINIO_ASSINATURA,
  DOMINIO_CADASTRO,
  DOMINIO_LOGIN,
  DOMINIO_PAINEL,
  DOMINIO_RAIZ,
} from "@/lib/proxy/domain-config";

function normalizePath(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return path;
}

function getLocalAppOrigin() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      return url.origin;
    }
  } catch {
    return null;
  }

  return null;
}

function getEnvironmentUrl(host: string, pathname: string) {
  const origin = getLocalAppOrigin() || `https://${host}`;
  return `${origin}${normalizePath(pathname)}`;
}

export function getPainelUrl(pathname: string) {
  return getEnvironmentUrl(DOMINIO_PAINEL, pathname);
}

export function getAssinaturaUrl(pathname = "/assinatura") {
  return getEnvironmentUrl(DOMINIO_ASSINATURA, pathname);
}

export function getLoginUrl(pathname = "/login") {
  return getEnvironmentUrl(DOMINIO_LOGIN, pathname);
}

export function getCadastroUrl(pathname = "/cadastro-salao") {
  return getEnvironmentUrl(DOMINIO_CADASTRO, pathname);
}

export function getAppClienteUrl(pathname = "/app-cliente/login") {
  return getEnvironmentUrl(DOMINIO_APP, pathname);
}

export function getAppProfissionalUrl(pathname = "/app-profissional/login") {
  return getEnvironmentUrl(DOMINIO_APP, pathname);
}

export function getRootUrl(pathname = "/") {
  return getEnvironmentUrl(DOMINIO_RAIZ, pathname);
}
