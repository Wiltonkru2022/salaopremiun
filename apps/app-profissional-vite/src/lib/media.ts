export function resolvePublicMediaUrl(path: string) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  const base = String(import.meta.env.VITE_MEDIA_BASE_URL || "").trim().replace(/\/$/, "");
  const normalized = value.replace(/^\/+/, "");
  return base ? `${base}/${normalized}` : `/${normalized}`;
}
