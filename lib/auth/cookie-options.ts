export function getAuthCookieOptions(host?: string | null) {
  const normalizedHost = String(host || "").split(":")[0].trim().toLowerCase();
  const isLocal = !normalizedHost || normalizedHost === "localhost" || normalizedHost === "127.0.0.1";
  return {
    secure: process.env.NODE_ENV === "production",
    ...(isLocal ? {} : { domain: normalizedHost.endsWith(".salaopremiun.com.br") || normalizedHost === "salaopremiun.com.br" ? ".salaopremiun.com.br" : undefined }),
  };
}
