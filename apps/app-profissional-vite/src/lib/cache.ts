const PREFIX = "salaopremiun.cache.";
const LEGACY_PREFIXES = ["salaopremiun.cache.", "salaopremium.cache."];
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

export type CacheEnvelope<T> = {
  value: T;
  savedAt: string;
  expiresAt: string;
};

function isExpired(expiresAt: unknown) {
  if (typeof expiresAt !== "string") return true;
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
}

export function readCache<T>(key: string, fallback: T): T {
  try {
    const storageKey = PREFIX + key;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("value" in parsed) ||
      isExpired(parsed.expiresAt)
    ) {
      localStorage.removeItem(storageKey);
      return fallback;
    }

    return parsed.value as T;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  try {
    const now = Date.now();
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({
        value,
        savedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + Math.max(60_000, ttlMs)).toISOString(),
      } satisfies CacheEnvelope<T>)
    );
  } catch {
    // Cache offline não pode travar o app.
  }
}

export function getCacheSavedAt(key: string) {
  try {
    const storageKey = PREFIX + key;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<unknown>>;
    if (isExpired(parsed.expiresAt)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return typeof parsed.savedAt === "string" ? parsed.savedAt : null;
  } catch {
    return null;
  }
}

export function clearProfessionalCache() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Falha de limpeza local não deve impedir o logout.
  }
}

export function clearOtherProfessionalCaches(activeProfessionalId: string) {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key || !LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      if (key.includes(`data.v2.${activeProfessionalId}.`)) continue;
      localStorage.removeItem(key);
    }
  } catch {
    // Cache é apenas uma otimização e nunca deve bloquear o app.
  }
}
