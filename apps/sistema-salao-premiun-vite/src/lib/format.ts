export function money(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

export function time(value: string | null | undefined) {
  return String(value || "").slice(0, 5) || "--:--";
}

export function normalizeStatus(value: string | null | undefined) {
  return String(value || "pendente").replaceAll("_", " ");
}

export function duration(minutes: number | string | null | undefined) {
  const total = Number(minutes || 0);
  if (!total) return "0 min";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h ${m}min`;
}
