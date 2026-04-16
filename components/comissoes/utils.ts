import { getStatusComissaoMeta } from "@/lib/domain/status";

export function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR");
}

export function getStatusLabel(status?: string | null) {
  return getStatusComissaoMeta(status).label;
}

export function getStatusClasses(status?: string | null) {
  return getStatusComissaoMeta(status).badgeClass;
}
