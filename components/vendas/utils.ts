type NomeJoin = {
  nome?: string | null;
};

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getJoinedName(
  value: NomeJoin | NomeJoin[] | null | undefined,
  fallback = "-"
) {
  const first = toArray(value)[0];
  return first?.nome || fallback;
}

export function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getStatusBadgeClass(status: string) {
  if (status === "fechada") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "cancelada") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "aguardando_pagamento") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  return "bg-zinc-100 text-zinc-700 border border-zinc-200";
}

export function getStatusLabel(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "fechada") return "Fechada";
  if (normalized === "cancelada") return "Cancelada";
  if (normalized === "aguardando_pagamento") return "No caixa";
  return status || "-";
}
