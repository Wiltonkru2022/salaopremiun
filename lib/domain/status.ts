export const STATUS_ASSINATURA = [
  "ativa",
  "pendente",
  "vencida",
  "cancelada",
  "teste_gratis",
] as const;

export const STATUS_AGENDAMENTO = [
  "confirmado",
  "pendente",
  "atendido",
  "cancelado",
  "aguardando_pagamento",
  "bloqueado",
] as const;

export const STATUS_COMANDA = [
  "aberta",
  "em_atendimento",
  "aguardando_pagamento",
  "fechada",
  "cancelada",
] as const;

export const STATUS_COMISSAO = [
  "pendente",
  "pago",
  "cancelado",
] as const;

export const STATUS_CAIXA = ["aberto", "fechado"] as const;

export type StatusAssinatura = (typeof STATUS_ASSINATURA)[number];
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];
export type StatusComanda = (typeof STATUS_COMANDA)[number];
export type StatusComissao = (typeof STATUS_COMISSAO)[number];
export type StatusCaixa = (typeof STATUS_CAIXA)[number];

const STATUS_COMISSAO_LEGACY_MAP: Record<string, StatusComissao> = {
  pendente: "pendente",
  pago: "pago",
  paga: "pago",
  cancelado: "cancelado",
  cancelada: "cancelado",
};

export function normalizeStatusComissao(
  status?: string | null
): StatusComissao {
  const normalized = String(status || "").trim().toLowerCase();
  return STATUS_COMISSAO_LEGACY_MAP[normalized] || "pendente";
}

export function getStatusComissaoQueryValues(
  status?: string | null
): string[] {
  const normalized = normalizeStatusComissao(status);

  if (normalized === "pago") {
    return ["pago", "paga"];
  }

  if (normalized === "cancelado") {
    return ["cancelado", "cancelada"];
  }

  return ["pendente"];
}

export function getStatusComissaoMeta(status?: string | null) {
  const normalized = normalizeStatusComissao(status);

  if (normalized === "pago") {
    return {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Lancamento ja quitado.",
      label: "Pago",
      value: normalized,
    };
  }

  if (normalized === "cancelado") {
    return {
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      description: "Lancamento retirado do rateio.",
      label: "Cancelado",
      value: normalized,
    };
  }

  return {
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    description: "Aguardando pagamento.",
    label: "Pendente",
    value: normalized,
  };
}
