import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function dateTimeValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildWebhookStatus(statusProcessamento?: string | null) {
  const normalized = normalizeString(statusProcessamento).toLowerCase();
  if (normalized === "erro") return "erro";
  if (normalized === "processado") return "processado";
  return "pendente";
}

export function buildWebhookMirrorKey(sourceId: string) {
  return `asaas:${normalizeString(sourceId)}`;
}

export function extractWebhookSourceId(chave?: string | null) {
  const normalized = normalizeString(chave);
  if (!normalized.startsWith("asaas:")) return normalized || null;
  return normalized.replace(/^asaas:/, "") || null;
}

export async function syncAdminMasterWebhookEvents() {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("asaas_webhook_eventos")
    .select(
      "id, evento, payment_id, payment_status, status_processamento, tentativas, erro_mensagem, payload, primeiro_recebido_em, ultimo_recebido_em, processado_em, id_salao, id_assinatura, id_cobranca, event_order, decisao"
    )
    .gte("ultimo_recebido_em", since)
    .order("ultimo_recebido_em", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(
      error.message || "Erro ao carregar eventos do webhook Asaas."
    );
  }

  const rows =
    (data as
      | Array<{
          id: string;
          evento?: string | null;
          payment_id?: string | null;
          payment_status?: string | null;
          status_processamento?: string | null;
          tentativas?: number | null;
          erro_mensagem?: string | null;
          payload?: Record<string, unknown> | null;
          primeiro_recebido_em?: string | null;
          ultimo_recebido_em?: string | null;
          processado_em?: string | null;
          id_salao?: string | null;
          id_assinatura?: string | null;
          id_cobranca?: string | null;
          event_order?: number | null;
          decisao?: string | null;
        }>
      | null) || [];

  if (rows.length === 0) {
    return {
      total: 0,
      erros: 0,
      processados: 0,
      pendentes: 0,
    };
  }

  const payload = rows.map((row) => {
    const status = buildWebhookStatus(row.status_processamento);
    const erroMensagem = normalizeString(row.erro_mensagem);

    return {
      chave: buildWebhookMirrorKey(row.id),
      origem: "asaas",
      evento: row.evento || "evento_desconhecido",
      id_salao: row.id_salao || null,
      status,
      payload_json: row.payload || {},
      resposta_json: {
        payment_id: row.payment_id || null,
        payment_status: row.payment_status || null,
        status_processamento: row.status_processamento || null,
        tentativas: Number(row.tentativas || 0),
        id_assinatura: row.id_assinatura || null,
        id_cobranca: row.id_cobranca || null,
        event_order: Number(row.event_order || 0),
        decisao: row.decisao || null,
      },
      erro_texto: erroMensagem || null,
      tentativas: Number(row.tentativas || 0),
      recebido_em: row.ultimo_recebido_em || row.primeiro_recebido_em || null,
      processado_em: row.processado_em || null,
      automatico: true,
      atualizado_em: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from("eventos_webhook")
    .upsert(payload, { onConflict: "chave" });

  if (upsertError) {
    throw new Error(
      upsertError.message || "Erro ao sincronizar eventos de webhook."
    );
  }

  return {
    total: rows.length,
    erros: rows.filter((row) => buildWebhookStatus(row.status_processamento) === "erro")
      .length,
    processados: rows.filter(
      (row) => buildWebhookStatus(row.status_processamento) === "processado"
    ).length,
    pendentes: rows.filter(
      (row) => buildWebhookStatus(row.status_processamento) === "pendente"
    ).length,
  };
}

export function formatWebhookDiagnosticDetail(row: {
  paymentId?: string | null;
  decisao?: string | null;
  erro?: string | null;
}) {
  if (normalizeString(row.erro)) {
    return normalizeString(row.erro);
  }

  if (normalizeString(row.decisao)) {
    return `Decisao: ${normalizeString(row.decisao)}`;
  }

  if (normalizeString(row.paymentId)) {
    return `Payment: ${normalizeString(row.paymentId)}`;
  }

  return "-";
}

export function formatWebhookDate(value?: string | null) {
  return dateTimeValue(value);
}
