import {
  DOMINIO_LOGIN,
  isLocalHost,
  normalizeHost,
} from "@/lib/proxy/domain-config";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getPublicAuthUrl(path: string, currentHost?: string | null) {
  const normalizedPath = normalizePath(path);
  const normalizedHost = normalizeHost(currentHost);

  if (!normalizedHost || isLocalHost(normalizedHost)) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${normalizedPath}`;
    }

    return normalizedPath;
  }

  return `https://${DOMINIO_LOGIN}${normalizedPath}`;
}
