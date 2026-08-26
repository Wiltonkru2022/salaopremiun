// Ponte de compatibilidade de midia; nao acessa banco, Auth ou Realtime.
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
    from() {
      return { getPublicUrl(path: string) { return { data: { publicUrl: resolvePublicMediaUrl(path) } }; } };
    },
  },
};
