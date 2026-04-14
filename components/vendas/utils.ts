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
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
  if (status === "cancelada") {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }
  if (status === "aguardando_pagamento") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }
  return "bg-zinc-100 text-zinc-700 border border-zinc-200";
}
