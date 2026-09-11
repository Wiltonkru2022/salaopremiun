import type { CookieOptionsWithName } from "@supabase/ssr";
import {
  APP_COOKIE_DOMAIN,
  isLocalHost,
  isManagedAppHost,
  normalizeHost,
} from "@/lib/proxy/domain-config";

export function isAppDomainHost(host?: string | null) {
  return isManagedAppHost(host);
}

export function getSupabaseCookieOptions(host?: string | null) {
  const normalizedHost = normalizeHost(host);
  const options: CookieOptionsWithName = {
    path: "/",
    sameSite: "lax",
  };

  if (isAppDomainHost(normalizedHost) && !isLocalHost(normalizedHost)) {
    options.domain = APP_COOKIE_DOMAIN;
    options.secure = true;
  }

  return options;
}
