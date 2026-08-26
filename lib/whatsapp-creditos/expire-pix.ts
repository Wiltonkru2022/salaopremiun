import "server-only";

import { buscarCobranca, excluirCobranca } from "@/lib/payments/pix-provider";
import { getDatabaseAdmin } from "@/lib/db/admin";

type ExpirePixOptions = {
  idSalao?: string;
  limit?: number;
};

const PAYMENT_PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const PAYMENT_CLOSED_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "REFUND_IN_PROGRESS",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
  "DUNNING_REQUESTED",
  "DUNNING_RECEIVED",
]);

export async function expireWhatsappPixRecargas(options: ExpirePixOptions = {}) {
  const supabase = getDatabaseAdmin() as any;
  const now = new Date().toISOString();
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);

  let query = supabase
    .from("whatsapp_creditos_recargas")
    .select("id, id_salao, asaas_payment_id, status, expira_em")
    .eq("status", "pendente")
    .lte("expira_em", now)
    .order("expira_em", { ascending: true })
    .limit(limit);

  if (options.idSalao) query = query.eq("id_salao", options.idSalao);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as Array<Record<string, unknown>>;
  const result = {
    checked: rows.length,
    expired: 0,
    paidWaitingReconciliation: 0,
    failed: 0,
  };

  for (const row of rows) {
    const id = String(row.id || "");
    const paymentId = String(row.asaas_payment_id || "").trim();

    if (!id) continue;

    try {
      if (!paymentId) {
        await supabase
          .from("whatsapp_creditos_recargas")
          .update({ status: "expirado", atualizado_em: now })
          .eq("id", id)
          .eq("status", "pendente");
        result.expired += 1;
        continue;
      }

      const payment = await buscarCobranca(paymentId);
      const providerStatus = String(payment.status || "").toUpperCase();

      if (PAYMENT_PAID_STATUSES.has(providerStatus)) {
        await supabase
          .from("whatsapp_creditos_recargas")
          .update({
            status: "falhou",
            pago_em: now,
            erro_texto:
              "Pagamento confirmado no Asaas, mas o credito ainda nao foi conciliado. Reprocessar pelo AdminMaster.",
            atualizado_em: now,
          })
          .eq("id", id)
          .eq("status", "pendente");
        result.paidWaitingReconciliation += 1;
        continue;
      }

      if (PAYMENT_CLOSED_STATUSES.has(providerStatus)) {
        await supabase
          .from("whatsapp_creditos_recargas")
          .update({ status: "cancelado", atualizado_em: now })
          .eq("id", id)
          .eq("status", "pendente");
        result.expired += 1;
        continue;
      }

      await excluirCobranca(paymentId);

      await supabase
        .from("whatsapp_creditos_recargas")
        .update({
          status: "expirado",
          erro_texto: null,
          atualizado_em: now,
        })
        .eq("id", id)
        .eq("status", "pendente");

      result.expired += 1;
    } catch (error) {
      result.failed += 1;
      await supabase
        .from("whatsapp_creditos_recargas")
        .update({
          erro_texto:
            error instanceof Error
              ? `Falha ao expirar PIX no Asaas: ${error.message}`.slice(0, 500)
              : "Falha ao expirar PIX no Asaas.",
          atualizado_em: now,
        })
        .eq("id", id)
        .eq("status", "pendente");
    }
  }

  return result;
}
