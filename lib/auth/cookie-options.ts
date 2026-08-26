export function getAppCookieOptions(host?: string | null) {
  const normalizedHost = String(host || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
  const rootDomain = String(process.env.APP_ROOT_DOMAIN || "salaopremiun.com.br")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\./, "")
    .replace(/\/.*$/, "");

  const useSharedDomain =
    process.env.NODE_ENV === "production" &&
    rootDomain &&
    (normalizedHost === rootDomain || normalizedHost.endsWith(`.${rootDomain}`));

  return {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    ...(useSharedDomain ? { domain: `.${rootDomain}` } : {}),
  };
}
