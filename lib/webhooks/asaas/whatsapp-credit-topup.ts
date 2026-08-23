import type { SupabaseClient } from "@supabase/supabase-js";

type RecargaWhatsappRow = {
  id: string;
  id_salao: string;
  status?: string | null;
  valor_centavos?: number | null;
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

function mapRecargaStatus(status?: string | null, event?: string | null) {
  if (isPagamentoConfirmado(status, event)) return "pago";

  const normalizedStatus = String(status || "").toUpperCase();
  const normalizedEvent = String(event || "").toUpperCase();

  if (normalizedStatus === "OVERDUE" || normalizedEvent === "PAYMENT_OVERDUE") {
    return "expirado";
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

function parseRecargaId(externalReference?: string | null) {
  const raw = String(externalReference || "").trim();
  if (!raw.startsWith("whatsapp_credit_topup:")) return null;
  const [, recargaId] = raw.split(":");
  return recargaId?.trim() || null;
}

function getPagamentoConfirmadoEm(payment: Record<string, unknown>, agoraIso: string) {
  const raw =
    String(payment.clientPaymentDate || "").trim() ||
    String(payment.paymentDate || "").trim() ||
    String(payment.confirmedDate || "").trim();

  if (!raw) return agoraIso;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? agoraIso : parsed.toISOString();
}

export async function processarWebhookRecargaWhatsapp(params: {
  supabaseAdmin: SupabaseClient;
  paymentId: string;
  payment: Record<string, unknown>;
  paymentStatus: string | null;
  event: string;
  agoraIso: string;
  externalReference: string | null;
}) {
  const recargaId = parseRecargaId(params.externalReference);

  if (!recargaId) {
    return {
      ok: true,
      ignored: true,
      reason: "whatsapp_credit_topup_reference_invalid",
    };
  }

  const { data: recarga, error: recargaError } = await params.supabaseAdmin
    .from("whatsapp_creditos_recargas")
    .select("id, id_salao, status, valor_centavos")
    .eq("id", recargaId)
    .maybeSingle();

  if (recargaError) throw recargaError;

  const recargaRow = recarga as RecargaWhatsappRow | null;

  if (!recargaRow?.id) {
    return {
      ok: true,
      ignored: true,
      reason: "whatsapp_credit_topup_not_found",
    };
  }

  const proximoStatus = mapRecargaStatus(params.paymentStatus, params.event);
  const jaPago = String(recargaRow.status || "").toLowerCase() === "pago";
  const pagamentoConfirmado = isPagamentoConfirmado(
    params.paymentStatus,
    params.event
  );
  const pagoEm = pagamentoConfirmado
    ? getPagamentoConfirmadoEm(params.payment, params.agoraIso)
    : null;

  const { error: updateError } = await params.supabaseAdmin
    .from("whatsapp_creditos_recargas")
    .update({
      status: proximoStatus,
      asaas_payment_id: params.paymentId,
      invoice_url: String(params.payment.invoiceUrl || "").trim() || null,
      bank_slip_url: String(params.payment.bankSlipUrl || "").trim() || null,
      response_json: params.payment,
      pago_em: pagoEm,
    })
    .eq("id", recargaRow.id);

  if (updateError) throw updateError;

  if (!pagamentoConfirmado || jaPago) {
    return {
      ok: true,
      kind: "whatsapp_credit_topup",
      status: proximoStatus,
      recargaId: recargaRow.id,
    };
  }

  const valorCentavos = Math.max(Number(recargaRow.valor_centavos || 0), 0);

  const rpcResult = await params.supabaseAdmin.rpc(
    "fn_whatsapp_creditos_registrar_recarga",
    {
      p_id_salao: recargaRow.id_salao,
      p_valor_centavos: valorCentavos,
      p_referencia_externa: `asaas:${params.paymentId}`,
      p_descricao: "Recarga via PIX",
    }
  );

  if (rpcResult.error) throw rpcResult.error;

  const { error: extraError } = await params.supabaseAdmin
    .from("saloes_recursos_extras")
    .upsert(
      {
        id_salao: recargaRow.id_salao,
        recurso_codigo: "whatsapp",
        habilitado: true,
        origem: "whatsapp_creditos",
        expira_em: null,
      },
      {
        onConflict: "id_salao,recurso_codigo",
      }
    );

  if (extraError) throw extraError;

  return {
    ok: true,
    kind: "whatsapp_credit_topup",
    status: "pago",
    recargaId: recargaRow.id,
    valorCentavos,
  };
}
