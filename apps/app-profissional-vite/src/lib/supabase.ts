// Compatibilidade temporaria de midia; sem SDK, Auth, banco ou Realtime Supabase.
function resolvePublicMediaUrl(path: string) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  const base = String(import.meta.env.VITE_MEDIA_BASE_URL || "").trim().replace(/\/$/, "");
  const normalized = value.replace(/^\/+/, "");
  return base ? `${base}/${normalized}` : `/${normalized}`;
}
export const supabase = {
  storage: {
    from(_bucket?: string) {
      return { getPublicUrl(path: string) { return { data: { publicUrl: resolvePublicMediaUrl(path) } }; } };
    },
  },
};
