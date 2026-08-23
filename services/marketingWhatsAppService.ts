import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCanMutatePlanFeature } from "@/lib/plans/access";
import { sendMetaWhatsAppTextMessage } from "@/lib/whatsapp/meta-cloud";
import type { Json } from "@/types/database.generated";

type SendManualMarketingWhatsAppParams = {
  idSalao: string;
  destino: string;
  mensagem: string;
  tipo?: string;
  tipoInterno?: string;
  template?: string | null;
  idAgendamento?: string | null;
  idempotencyKey?: string | null;
};

type MetaSendResult = {
  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
  }>;
};

function normalizeDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeDestino(value: string) {
  const digits = normalizeDigits(value);
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function normalizeMensagem(value: string) {
  return String(value || "").trim().slice(0, 4000);
}

function getProviderMessageId(result: MetaSendResult) {
  return String(result.messages?.[0]?.id || "").trim() || null;
}

function resolveTipoInterno(tipo: string, tipoInterno?: string | null) {
  const explicit = String(tipoInterno || "").trim();
  if (explicit) return explicit;

  const normalized = String(tipo || "").trim().toLowerCase();
  if (normalized.includes("pagamento")) return "pagamento_confirmacao";
  if (normalized.includes("cancel")) return "agendamento_cancelamento";
  if (normalized.includes("lembrete")) return "lembrete_agendamento";
  if (normalized.includes("alter")) return "agendamento_alteracao";
  if (normalized.includes("codigo") || normalized.includes("otp")) {
    return "codigo_verificacao";
  }
  if (normalized.includes("agenda") || normalized.includes("confirm")) {
    return "agendamento_confirmacao";
  }

  return "marketing";
}

function getDebitNumber(data: Record<string, unknown>, key: string) {
  const value = Number(data[key] || 0);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

export async function sendManualMarketingWhatsApp({
  idSalao,
  destino,
  mensagem,
  tipo = "manual",
  tipoInterno,
  template = null,
  idAgendamento = null,
  idempotencyKey = null,
}: SendManualMarketingWhatsAppParams) {
  await assertCanMutatePlanFeature(idSalao, "whatsapp");

  const supabaseAdmin = getSupabaseAdmin();
  const destinoNormalizado = normalizeDestino(destino);
  const mensagemNormalizada = normalizeMensagem(mensagem);
  const envioId = randomUUID();
  const tipoInternoResolvido = resolveTipoInterno(tipo, tipoInterno);
  const idempotency =
    String(idempotencyKey || "").trim() || `whatsapp_envio:${envioId}`;

  if (!destinoNormalizado) {
    throw new Error("Numero de destino obrigatorio.");
  }

  if (!mensagemNormalizada) {
    throw new Error("Mensagem obrigatoria.");
  }

  const envioExistente = await supabaseAdmin
    .from("whatsapp_envios")
    .select("id, provider_message_id, id_credito_movimentacao, status")
    .eq("id_salao", idSalao)
    .eq("idempotency_key", idempotency)
    .maybeSingle();

  if (envioExistente.error) {
    throw new Error(
      envioExistente.error.message || "Nao foi possivel validar idempotencia."
    );
  }

  if (envioExistente.data?.id) {
    return {
      envioId: envioExistente.data.id,
      providerMessageId: envioExistente.data.provider_message_id || null,
      creditoMovimentacaoId:
        envioExistente.data.id_credito_movimentacao || null,
      reused: true,
    };
  }

  let creditoMovimentacaoId: string | null = null;
  let providerAccepted = false;

  try {
    const envioInsert = await supabaseAdmin
      .from("whatsapp_envios")
      .insert({
        id: envioId,
        id_salao: idSalao,
        tipo,
        destino: destinoNormalizado,
        template,
        mensagem: mensagemNormalizada,
        status: "processando",
        custo_creditos: 0,
        provider: "meta_cloud",
        tipo_interno: tipoInternoResolvido,
        idempotency_key: idempotency,
        payload_json: {
          channel: "whatsapp",
          request: {
            destino: destinoNormalizado,
            mensagem: mensagemNormalizada,
          },
          tipo_interno: tipoInternoResolvido,
        } as Json,
      })
      .select("id")
      .single();

    if (envioInsert.error || !envioInsert.data?.id) {
      throw new Error(
        envioInsert.error?.message || "Nao foi possivel registrar o envio WhatsApp."
      );
    }

    const debitoResult = await supabaseAdmin.rpc("fn_whatsapp_creditos_debitar", {
      p_id_salao: idSalao,
      p_tipo_interno: tipoInternoResolvido,
      p_idempotency_key: idempotency,
      p_id_mensagem: envioId,
      p_id_agendamento: idAgendamento || null,
      p_descricao: "Envio WhatsApp",
    });

    if (debitoResult.error) {
      throw new Error(
        debitoResult.error.message || "Nao foi possivel debitar saldo WhatsApp."
      );
    }

    const debito = (debitoResult.data || {}) as Record<string, unknown>;
    creditoMovimentacaoId = String(debito.movimentacaoId || "").trim() || null;

    const precoVendaCentavos = getDebitNumber(debito, "precoVendaCentavos");
    const custoMetaEstimadoCentavos = getDebitNumber(
      debito,
      "custoMetaEstimadoCentavos"
    );
    const margemCentavos = getDebitNumber(debito, "margemCentavos");
    const categoriaMeta = String(debito.categoriaMeta || "").trim() || null;

    const debitoUpdate = await supabaseAdmin
      .from("whatsapp_envios")
      .update({
        id_credito_movimentacao: creditoMovimentacaoId,
        custo_creditos: precoVendaCentavos > 0 ? 1 : 0,
        categoria_meta: categoriaMeta,
        custo_meta_estimado_centavos: custoMetaEstimadoCentavos,
        preco_venda_centavos: precoVendaCentavos,
        margem_centavos: margemCentavos,
        sem_custo: precoVendaCentavos === 0,
        payload_json: {
          channel: "whatsapp",
          credito_movimentacao_id: creditoMovimentacaoId,
          request: {
            destino: destinoNormalizado,
            mensagem: mensagemNormalizada,
          },
          debito,
          tipo_interno: tipoInternoResolvido,
        } as Json,
      })
      .eq("id", envioId);

    if (debitoUpdate.error) {
      throw new Error(
        debitoUpdate.error.message || "Nao foi possivel vincular debito ao envio."
      );
    }

    const providerResult = (await sendMetaWhatsAppTextMessage({
      to: destinoNormalizado,
      body: mensagemNormalizada,
    })) as MetaSendResult;

    const providerMessageId = getProviderMessageId(providerResult);
    providerAccepted = true;

    const updateResult = await supabaseAdmin
      .from("whatsapp_envios")
      .update({
        status: "enviado",
        enviado_em: new Date().toISOString(),
        provider_message_id: providerMessageId,
        wamid: providerMessageId,
        payload_json: {
          channel: "whatsapp",
          credito_movimentacao_id: creditoMovimentacaoId,
          request: {
            destino: destinoNormalizado,
            mensagem: mensagemNormalizada,
          },
          tipo_interno: tipoInternoResolvido,
          response: providerResult,
        } as Json,
      })
      .eq("id", envioId);

    if (updateResult.error) {
      throw new Error(
        updateResult.error.message || "Nao foi possivel finalizar o envio WhatsApp."
      );
    }

    return {
      envioId,
      providerMessageId,
      creditoMovimentacaoId,
      providerResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao enviar mensagem WhatsApp.";

    const estornoAutomatico = Boolean(creditoMovimentacaoId && !providerAccepted);

    if (creditoMovimentacaoId && !providerAccepted) {
      await supabaseAdmin.rpc("fn_whatsapp_creditos_estornar", {
        p_id_salao: idSalao,
        p_movimentacao_id: creditoMovimentacaoId,
        p_idempotency_key: `estorno:${envioId}:${creditoMovimentacaoId}`,
        p_descricao: "Estorno automatico por falha no envio WhatsApp",
      });
    }

    if (envioId) {
      await supabaseAdmin
        .from("whatsapp_envios")
        .update({
          status: "erro",
          erro_texto: errorMessage,
          estornado: estornoAutomatico,
          estornado_em: estornoAutomatico ? new Date().toISOString() : null,
          falhou_em: new Date().toISOString(),
          payload_json: {
            channel: "whatsapp",
            credito_movimentacao_id: creditoMovimentacaoId,
            failed_at: new Date().toISOString(),
            tipo_interno: tipoInternoResolvido,
          } as Json,
        })
        .eq("id", envioId);
    }

    throw new Error(errorMessage);
  }
}
