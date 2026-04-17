import type { CookieOptionsWithName } from "@supabase/ssr";

const APP_COOKIE_DOMAIN = ".salaopremiun.com.br";
const APP_DOMAIN = "salaopremiun.com.br";

function normalizeHost(host?: string | null) {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function isAppDomainHost(host?: string | null) {
  const normalizedHost = normalizeHost(host);

  return (
    normalizedHost === APP_DOMAIN ||
    normalizedHost.endsWith(APP_COOKIE_DOMAIN)
  );
}

export function getSupabaseCookieOptions(host?: string | null) {
  const options: CookieOptionsWithName = {
    path: "/",
    sameSite: "lax",
  };

  if (isAppDomainHost(host)) {
    options.domain = APP_COOKIE_DOMAIN;
    options.secure = true;
  }

  return options;
}
