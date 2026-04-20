import type { AssinaturaRow, BillingType, CheckoutResponse } from "./types";

export type CobrancaAtualRow = {
  id: string;
  valor: number | null;
  status: string | null;
  forma_pagamento: BillingType | null;
  data_expiracao: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  asaas_payment_id: string | null;
  txid: string | null;
};

const PLANOS_COBRAVEIS = ["basico", "pro", "premium"] as const;
export type PlanoCobravel = (typeof PLANOS_COBRAVEIS)[number];

export function normalizarCodigoPlano(value?: string | null) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]+/g, "_")
    .trim()
    .toLowerCase();

  return normalized.startsWith("plano_")
    ? normalized.replace(/^plano_/, "")
    : normalized;
}

export function isPlanoCobravel(value?: string | null): value is PlanoCobravel {
  return PLANOS_COBRAVEIS.includes(normalizarCodigoPlano(value) as PlanoCobravel);
}

export function normalizarPlanoCobravel(
  value?: string | null,
  fallback: PlanoCobravel = "basico"
): PlanoCobravel {
  const normalized = normalizarCodigoPlano(value);

  if (
    !normalized ||
    ["teste_gratis", "testegratis", "trial", "gratis"].includes(normalized)
  ) {
    return fallback;
  }

  return isPlanoCobravel(normalized) ? normalized : fallback;
}

export function montarCheckoutDaCobranca(params: {
  cobranca: CobrancaAtualRow;
  assinatura: AssinaturaRow | null;
}): CheckoutResponse {
  const { cobranca, assinatura } = params;
  const billing =
    cobranca.forma_pagamento === "PIX" ||
    cobranca.forma_pagamento === "BOLETO" ||
    cobranca.forma_pagamento === "CREDIT_CARD"
      ? cobranca.forma_pagamento
      : "PIX";

  return {
    ok: true,
    customerId: assinatura?.asaas_customer_id || "",
    paymentId:
      cobranca.asaas_payment_id ||
      cobranca.txid ||
      assinatura?.asaas_payment_id ||
      "",
    valor: Number(cobranca.valor || 0),
    plano: normalizarPlanoCobravel(assinatura?.plano),
    billingType: billing,
    status: cobranca.status || "PENDING",
    qrCodeBase64: null,
    pixCopiaCola: null,
    vencimento: cobranca.data_expiracao || "",
    invoiceUrl: cobranca.invoice_url || null,
    bankSlipUrl: cobranca.bank_slip_url || null,
  };
}
