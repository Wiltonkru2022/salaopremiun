export function parseNumber(value: string | number | null | undefined) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeTime(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export function getNivelBadgeClass(nivel: string) {
  switch (nivel) {
    case "admin":
      return "border-zinc-900 bg-zinc-900 text-white";
    case "gerente":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "recepcao":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "profissional":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}
