const SEO_BLOCKED_SALON_SLUGS = new Set([
  "salao-premium-teste-google",
  "studio-wk",
]);

export function normalizePublicSlug(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isSeoBlockedSalonSlug(value?: string | null) {
  const slug = normalizePublicSlug(value);
  if (!slug) return true;

  return SEO_BLOCKED_SALON_SLUGS.has(slug);
}
