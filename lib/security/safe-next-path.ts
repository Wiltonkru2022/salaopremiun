export function normalizeSafeInternalPath(
  value: unknown,
  allowedPrefix: string,
  fallback: string
) {
  const raw = String(value || "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;

  try {
    const parsed = new URL(raw, "https://salaopremiun.local");
    if (parsed.origin !== "https://salaopremiun.local") return fallback;
    if (
      parsed.pathname !== allowedPrefix &&
      !parsed.pathname.startsWith(`${allowedPrefix}/`)
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
