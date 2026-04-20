export const PAID_ASAAS_STATUSES = new Set([
  "RECEIVED",
  "CONFIRMED",
  "RECEIVED_IN_CASH",
]);

export const PAID_ASAAS_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_RECEIVED_IN_CASH",
]);

const TERMINAL_REVERSAL_EVENTS = new Set([
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE",
  "PAYMENT_BANK_SLIP_CANCELLED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
]);

const TERMINAL_REVERSAL_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_RECEIVED",
  "AWAITING_CHARGEBACK_REVERSAL",
  "DUNNING_REQUESTED",
  "DUNNING_RECEIVED",
  "DUNNING_RETURNED",
  "CANCELLED",
]);

export function shouldActivateAccess(event: string, billingType?: string | null) {
  const type = String(billingType || "").toUpperCase();

  if (type === "CREDIT_CARD") return PAID_ASAAS_EVENTS.has(event);
  if (type === "BOLETO") return PAID_ASAAS_EVENTS.has(event);
  if (type === "PIX") return PAID_ASAAS_EVENTS.has(event);

  return PAID_ASAAS_EVENTS.has(event);
}

export function isTerminalReversalEvent(event: string, status?: string | null) {
  const normalizedStatus = String(status || "").toUpperCase();

  return (
    TERMINAL_REVERSAL_EVENTS.has(event) ||
    TERMINAL_REVERSAL_STATUSES.has(normalizedStatus)
  );
}

export function isInternalPaidStatus(status?: string | null) {
  return ["ativo", "ativa", "pago", "paid", "received", "confirmed"].includes(
    String(status || "").toLowerCase()
  );
}

export function isInternalTerminalStatus(status?: string | null) {
  return ["cancelada", "cancelado", "cancelled", "refunded", "estornado"].includes(
    String(status || "").toLowerCase()
  );
}

export function getWebhookEventOrder(event: string, status?: string | null) {
  const normalizedStatus = String(status || "").toUpperCase();

  if (isTerminalReversalEvent(event, normalizedStatus)) return 120;

  if (PAID_ASAAS_EVENTS.has(event) || PAID_ASAAS_STATUSES.has(normalizedStatus)) {
    return 100;
  }

  if (event === "PAYMENT_OVERDUE" || normalizedStatus === "OVERDUE") return 60;
  if (event === "PAYMENT_RESTORED" || normalizedStatus === "PENDING") return 40;

  return 20;
}

export function mapAsaasStatusToInternal(
  status?: string | null,
  event?: string | null
) {
  const normalized = String(status || "").toUpperCase();
  const normalizedEvent = String(event || "").toUpperCase();

  if (PAID_ASAAS_EVENTS.has(normalizedEvent) || PAID_ASAAS_STATUSES.has(normalized)) {
    return "ativo";
  }

  if (isTerminalReversalEvent(normalizedEvent, normalized)) return "cancelada";
  if (normalizedEvent === "PAYMENT_OVERDUE") return "vencida";
  if (normalizedEvent === "PAYMENT_RESTORED") return "pendente";
  if (normalized === "PENDING") return "pendente";
  if (normalized === "OVERDUE") return "vencida";

  return "pendente";
}

export function toMiddayIso(dateOnly?: string | null) {
  if (!dateOnly) return null;

  const value = String(dateOnly).trim();
  if (!value) return null;

  const iso = new Date(`${value}T12:00:00`);
  if (Number.isNaN(iso.getTime())) return null;

  return iso.toISOString();
}

export function getCardSnapshot(payment: Record<string, unknown>) {
  const creditCard =
    payment.creditCard && typeof payment.creditCard === "object"
      ? (payment.creditCard as Record<string, unknown>)
      : null;

  return {
    token: String(creditCard?.creditCardToken || "").trim() || null,
    brand: String(creditCard?.creditCardBrand || "").trim() || null,
    last4: String(creditCard?.creditCardNumber || "").trim() || null,
    tokenizedAt: creditCard?.creditCardToken ? new Date().toISOString() : null,
  };
}
