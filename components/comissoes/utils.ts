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
  if (status === "paga") return "Paga";
  if (status === "cancelada") return "Cancelada";
  return "Pendente";
}

export function getStatusClasses(status?: string | null) {
  if (status === "paga") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "cancelada") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}