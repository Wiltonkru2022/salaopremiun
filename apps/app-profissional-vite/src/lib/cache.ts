const PREFIX = "salaopremiun.cache.";
const CACHE_TTL_MS = 30 * 60 * 1000;

export type CacheEnvelope<T> = {
  value: T;
  savedAt: string;
};

function isExpired(savedAt: string) {
  const timestamp = new Date(savedAt).getTime();
  return !Number.isFinite(timestamp) || Date.now() - timestamp > CACHE_TTL_MS;
}

export function readCache<T>(key: string, fallback: T): T {
  try {
    const storageKey = PREFIX + key;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T | CacheEnvelope<T>;

    if (
      parsed &&
      typeof parsed === "object" &&
      "value" in parsed &&
      "savedAt" in parsed
    ) {
      const envelope = parsed as CacheEnvelope<T>;
      if (typeof envelope.savedAt !== "string" || isExpired(envelope.savedAt)) {
        localStorage.removeItem(storageKey);
        return fallback;
      }
      return envelope.value;
    }

    localStorage.removeItem(storageKey);
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ value, savedAt: new Date().toISOString() } satisfies CacheEnvelope<T>)
    );
  } catch {
    // O cache offline nunca pode impedir o app de funcionar.
  }
}

export function getCacheSavedAt(key: string) {
  try {
    const storageKey = PREFIX + key;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<unknown>>;
    if (typeof parsed.savedAt !== "string" || isExpired(parsed.savedAt)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return parsed.savedAt;
  } catch {
    return null;
  }
}

export function clearProfessionalCache(profissionalId?: string) {
  try {
    const prefix = profissionalId
      ? `${PREFIX}data.v2.${profissionalId}.`
      : PREFIX;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) localStorage.removeItem(key);
    }
  } catch {
    // Limpeza de cache nao pode travar logout/login.
  }
}
