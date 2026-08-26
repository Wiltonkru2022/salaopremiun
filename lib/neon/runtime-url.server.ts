import "server-only";

const VERIFIED_NEON_RUNTIME_HOST =
  "ep-proud-unit-aya64n85-pooler.c-5.us-east-2.aws.neon.tech";

function configuredRuntimeHost() {
  const value = String(process.env.NEON_RUNTIME_HOST || "").trim();
  if (!value) return VERIFIED_NEON_RUNTIME_HOST;
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^postgres(?:ql)?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
}

export function resolveNeonRuntimeUrl(rawValue: string | undefined) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (!/\.neon\.tech$/i.test(url.hostname)) return raw;

    const runtimeHost = configuredRuntimeHost();
    if (!runtimeHost || !/\.neon\.tech$/i.test(runtimeHost)) {
      throw new Error("NEON_RUNTIME_HOST invalido.");
    }

    url.hostname = runtimeHost;
    return url.toString();
  } catch (cause) {
    if (cause instanceof Error && cause.message === "NEON_RUNTIME_HOST invalido.") {
      throw cause;
    }
    throw new Error("URL de conexao Neon invalida.");
  }
}

export function hasNeonRuntimeUrl(rawValue: string | undefined) {
  return Boolean(resolveNeonRuntimeUrl(rawValue));
}
