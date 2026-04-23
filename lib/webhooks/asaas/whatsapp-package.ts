import type { SupabaseClient } from "@supabase/supabase-js";

type CompraWhatsappRow = {
  id: string;
  id_salao: string;
  id_pacote: string;
  status?: string | null;
  quantidade_creditos?: number | null;
};

function isPagamentoConfirmado(status?: string | null, event?: string | null) {
  const normalizedStatus = String(status || "").toUpperCase();
  const normalizedEvent = String(event || "").toUpperCase();

  return (
    normalizedStatus === "RECEIVED" ||
    normalizedStatus === "CONFIRMED" ||
    normalizedStatus === "RECEIVED_IN_CASH" ||
    normalizedEvent === "PAYMENT_RECEIVED" ||
    normalizedEvent === "PAYMENT_CONFIRMED" ||
    normalizedEvent === "PAYMENT_RECEIVED_IN_CASH"
  );
}

function mapCompraStatus(status?: string | null, event?: string | null) {
  if (isPagamentoConfirmado(status, event)) {
    return "pago";
  }

  const normalizedStatus = String(status || "").toUpperCase();
  const normalizedEvent = String(event || "").toUpperCase();

  if (normalizedStatus === "OVERDUE" || normalizedEvent === "PAYMENT_OVERDUE") {
    return "vencido";
  }

  if (
    normalizedStatus === "REFUNDED" ||
    normalizedEvent === "PAYMENT_REFUNDED" ||
    normalizedEvent === "PAYMENT_DELETED" ||
    normalizedEvent === "PAYMENT_BANK_SLIP_CANCELLED" ||
    normalizedEvent === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
  ) {
    return "cancelado";
  }

  return "pendente";
}

function parseCompraId(externalReference?: string | null) {
  const raw = String(externalReference || "").trim();
  if (!raw.startsWith("whatsapp_package:")) {
    return null;
  }

  const [, compraId] = raw.split(":");
  return compraId?.trim() || null;
}

function getPagamentoConfirmadoEm(payment: Record<string, unknown>, agoraIso: string) {
  const raw =
    String(payment.clientPaymentDate || "").trim() ||
    String(payment.paymentDate || "").trim() ||
    String(payment.confirmedDate || "").trim();

  if (!raw) {
    return agoraIso;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? agoraIso : parsed.toISOString();
}

export async function processarWebhookPacoteWhatsapp(params: {
  supabaseAdmin: SupabaseClient;
  paymentId: string;
  payment: Record<string, unknown>;
  paymentStatus: string | null;
  event: string;
  agoraIso: string;
  externalReference: string | null;
}) {
  const compraId = parseCompraId(params.externalReference);

  if (!compraId) {
    return {
      ok: true,
      ignored: true,
      reason: "whatsapp_package_reference_invalid",
    };
  }

  const { data: compra, error: compraError } = await params.supabaseAdmin
    .from("whatsapp_pacote_compras")
    .select("id, id_salao, id_pacote, status, quantidade_creditos")
    .eq("id", compraId)
    .maybeSingle();

  if (compraError) {
    throw compraError;
  }

  const compraRow = compra as CompraWhatsappRow | null;

  if (!compraRow?.id) {
    return {
      ok: true,
      ignored: true,
      reason: "whatsapp_package_not_found",
    };
  }

  const proximoStatus = mapCompraStatus(params.paymentStatus, params.event);
  const jaPago = String(compraRow.status || "").toLowerCase() === "pago";
  const pagamentoConfirmado = isPagamentoConfirmado(
    params.paymentStatus,
    params.event
  );
  const pagoEm = pagamentoConfirmado
    ? getPagamentoConfirmadoEm(params.payment, params.agoraIso)
    : null;

  const { error: updateError } = await params.supabaseAdmin
    .from("whatsapp_pacote_compras")
    .update({
      status: proximoStatus,
      asaas_payment_id: params.paymentId,
      invoice_url: String(params.payment.invoiceUrl || "").trim() || null,
      bank_slip_url: String(params.payment.bankSlipUrl || "").trim() || null,
      response_json: params.payment,
      pago_em: pagoEm,
    })
    .eq("id", compraRow.id);

  if (updateError) {
    throw updateError;
  }

  if (!pagamentoConfirmado || jaPago) {
    return {
      ok: true,
      kind: "whatsapp_package",
      status: proximoStatus,
      compraId: compraRow.id,
    };
  }

  const creditos = Math.max(Number(compraRow.quantidade_creditos || 0), 0);

  const { error: insertCreditosError } = await params.supabaseAdmin
    .from("whatsapp_pacote_saloes")
    .insert({
      id_salao: compraRow.id_salao,
      id_pacote: compraRow.id_pacote,
      creditos_total: creditos,
      creditos_usados: 0,
      creditos_saldo: creditos,
      status: "ativo",
      comprado_em: params.agoraIso,
    });

  if (insertCreditosError) {
    throw insertCreditosError;
  }

  const { error: extraError } = await params.supabaseAdmin
    .from("saloes_recursos_extras")
    .upsert(
      {
        id_salao: compraRow.id_salao,
        recurso_codigo: "whatsapp",
        habilitado: true,
        origem: "whatsapp_pacote",
        expira_em: null,
      },
      {
        onConflict: "id_salao,recurso_codigo",
      }
    );

  if (extraError) {
    throw extraError;
  }

  return {
    ok: true,
    kind: "whatsapp_package",
    status: "pago",
    compraId: compraRow.id,
    creditosLiberados: creditos,
  };
}
