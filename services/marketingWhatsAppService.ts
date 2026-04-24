import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCanMutatePlanFeature } from "@/lib/plans/access";
import { sendMetaWhatsAppTextMessage } from "@/lib/whatsapp/meta-cloud";
import type { Json } from "@/types/database.generated";

type SendManualMarketingWhatsAppParams = {
  idSalao: string;
  destino: string;
  mensagem: string;
  tipo?: string;
  template?: string | null;
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

export async function sendManualMarketingWhatsApp({
  idSalao,
  destino,
  mensagem,
  tipo = "manual",
  template = null,
}: SendManualMarketingWhatsAppParams) {
  await assertCanMutatePlanFeature(idSalao, "whatsapp");

  const supabaseAdmin = getSupabaseAdmin();
  const destinoNormalizado = normalizeDestino(destino);
  const mensagemNormalizada = normalizeMensagem(mensagem);

  if (!destinoNormalizado) {
    throw new Error("Numero de destino obrigatorio.");
  }

  if (!mensagemNormalizada) {
    throw new Error("Mensagem obrigatoria.");
  }

  let creditoReservaId: string | null = null;
  let envioId: string | null = null;

  try {
    const reservaResult = await (supabaseAdmin as any).rpc("reservar_credito_whatsapp", {
      p_id_salao: idSalao,
      p_quantidade: 1,
    });

    if (reservaResult.error) {
      throw new Error(
        reservaResult.error.message || "Nao foi possivel reservar credito WhatsApp."
      );
    }

    creditoReservaId = String(reservaResult.data || "").trim() || null;

    const envioInsert = await supabaseAdmin
      .from("whatsapp_envios")
      .insert({
        id_salao: idSalao,
        tipo,
        destino: destinoNormalizado,
        template,
        mensagem: mensagemNormalizada,
        status: "processando",
        custo_creditos: 1,
        provider: "meta_cloud",
        payload_json: {
          channel: "whatsapp",
          request: {
            destino: destinoNormalizado,
            mensagem: mensagemNormalizada,
          },
          credito_reserva_id: creditoReservaId,
        } as Json,
      })
      .select("id")
      .single();

    if (envioInsert.error || !envioInsert.data?.id) {
      throw new Error(
        envioInsert.error?.message || "Nao foi possivel registrar o envio WhatsApp."
      );
    }

    envioId = envioInsert.data.id;

    const providerResult = (await sendMetaWhatsAppTextMessage({
      to: destinoNormalizado,
      body: mensagemNormalizada,
    })) as MetaSendResult;

    const providerMessageId = getProviderMessageId(providerResult);

    const updateResult = await supabaseAdmin
      .from("whatsapp_envios")
      .update({
        status: "enviado",
        enviado_em: new Date().toISOString(),
        provider_message_id: providerMessageId,
        payload_json: {
          channel: "whatsapp",
          credito_reserva_id: creditoReservaId,
          request: {
            destino: destinoNormalizado,
            mensagem: mensagemNormalizada,
          },
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
      creditoReservaId,
      providerResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao enviar mensagem WhatsApp.";

    if (creditoReservaId) {
      await (supabaseAdmin as any).rpc("estornar_credito_whatsapp", {
        p_credito_id: creditoReservaId,
        p_quantidade: 1,
      });
    }

    if (envioId) {
      await supabaseAdmin
        .from("whatsapp_envios")
        .update({
          status: "erro",
          erro_texto: errorMessage,
          payload_json: {
            channel: "whatsapp",
            credito_reserva_id: creditoReservaId,
            failed_at: new Date().toISOString(),
          } as Json,
        })
        .eq("id", envioId);
    }

    throw new Error(errorMessage);
  }
}
