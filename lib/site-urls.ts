import { DOMINIO_ASSINATURA, DOMINIO_PAINEL } from "@/lib/proxy/domain-config";

function normalizePath(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return path;
}

export function getPainelUrl(pathname: string) {
  return `https://${DOMINIO_PAINEL}${normalizePath(pathname)}`;
}

export function getAssinaturaUrl(pathname = "/assinatura") {
  return `https://${DOMINIO_ASSINATURA}${normalizePath(pathname)}`;
}
