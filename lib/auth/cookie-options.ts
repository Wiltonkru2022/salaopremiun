export function getAppCookieOptions(host?: string | null) {
  const hostname = String(host || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(":")[0];
  const rootDomain = String(process.env.APP_ROOT_DOMAIN || "salaopremiun.com.br")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\./, "")
    .replace(/\/.*$/, "");
  const onRootDomain = Boolean(
    rootDomain && (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`))
  );

  return {
    secure: process.env.NODE_ENV === "production" || onRootDomain,
    ...(onRootDomain ? { domain: `.${rootDomain}` } : {}),
  };
}
