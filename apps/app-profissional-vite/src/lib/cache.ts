const PREFIX = "salaopremiun.cache.";

export type CacheEnvelope<T> = {
  value: T;
  savedAt: string;
};

export function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T | CacheEnvelope<T>;
    if (
      parsed &&
      typeof parsed === "object" &&
      "value" in parsed &&
      "savedAt" in parsed
    ) {
      return parsed.value;
    }
    return parsed as T;
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
    // Cache offline nao pode travar o app.
  }
}

export function getCacheSavedAt(key: string) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<unknown>>;
    return typeof parsed.savedAt === "string" ? parsed.savedAt : null;
  } catch {
    return null;
  }
}
