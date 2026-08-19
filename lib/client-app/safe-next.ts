const APP_CLIENTE_FALLBACK = "/app-cliente/inicio";

export function safeAppClienteNext(
  value: unknown,
  fallback = APP_CLIENTE_FALLBACK
) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (raw !== "/app-cliente" && !raw.startsWith("/app-cliente/")) return fallback;

  try {
    const base = new URL("https://salaopremium.local");
    const parsed = new URL(raw, base);
    if (parsed.origin !== base.origin) return fallback;
    if (
      parsed.pathname !== "/app-cliente" &&
      !parsed.pathname.startsWith("/app-cliente/")
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
