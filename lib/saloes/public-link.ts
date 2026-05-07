export function normalizeSalaoSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function buildDefaultSalaoSlug(nome: string, idSalao: string) {
  const base = normalizeSalaoSlug(nome) || "salao";
  const suffix = String(idSalao || "").replace(/-/g, "").slice(0, 6);
  return suffix ? `${base}-${suffix}` : base;
}

export function buildSalaoPublicPath(slugOrId: string) {
  return `/salao/${encodeURIComponent(slugOrId)}`;
}

export function buildSalaoPublicUrl(slugOrId: string) {
  return `https://salaopremiun.com.br${buildSalaoPublicPath(slugOrId)}`;
}
