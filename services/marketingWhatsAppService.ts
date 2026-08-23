import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCanMutatePlanFeature } from "@/lib/plans/access";
import {
  sendMetaWhatsAppTemplateMessage,
  sendMetaWhatsAppTextMessage,
} from "@/lib/whatsapp/meta-cloud";
import type { Json } from "@/types/database.generated";

type SendManualMarketingWhatsAppParams = {
  idSalao: string;
  destino: string;
  mensagem?: string | null;
  tipo?: string;
  tipoInterno?: string;
  template?: string | null;
  templateVariables?: Array<string | number | boolean | null | undefined>;
  idAgendamento?: string | null;
  idempotencyKey?: string | null;
};

type WhatsAppTemplateConfig = {
  id: string;
  nome: string;
  nomeMeta: string;
  idioma: string;
  categoriaMeta: string | null;
  tipoInterno: string | null;
  conteudo: string;
  variaveis: unknown;
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

function normalizeTemplateValues(
  values?: Array<string | number | boolean | null | undefined>
) {
  return (values || []).map((value) => String(value ?? "").trim());
}

function getTemplateVariableCount(variaveis: unknown) {
  if (!Array.isArray(variaveis)) return 0;

  return variaveis.reduce((max, item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return Math.max(max, index + 1);
    }

    const position = Number((item as Record<string, unknown>).position || 0);
    return Math.max(max, Number.isFinite(position) ? position : index + 1);
  }, 0);
}

function renderTemplateMessage(template: WhatsAppTemplateConfig, values: string[]) {
  return normalizeMensagem(
    template.conteudo.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, position) => {
      const value = values[Number(position) - 1];
      return value || match;
    })
  );
}

async function findTemplateByColumn(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  column: string,
  value: string
) {
  const { data, error } = await (supabaseAdmin as any)
    .from("whatsapp_templates")
    .select(
      "id, nome, nome_meta, idioma, categoria_meta, tipo_interno, conteudo, variaveis_json"
    )
    .eq("ativo", true)
    .eq(column, value)
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Nao foi possivel carregar o template WhatsApp.");
  }

  return data as Record<string, unknown> | null;
}

async function loadWhatsAppTemplateConfig(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  template?: string | null
): Promise<WhatsAppTemplateConfig | null> {
  const name = String(template || "").trim();
  if (!name) return null;

  const row =
    (await findTemplateByColumn(supabaseAdmin, "nome_meta", name)) ||
    (await findTemplateByColumn(supabaseAdmin, "nome", name)) ||
    (await findTemplateByColumn(supabaseAdmin, "tipo_interno", name));

  if (!row?.id) {
    throw new Error(`Template WhatsApp nao encontrado ou inativo: ${name}.`);
  }

  const nomeMeta = String(row.nome_meta || row.nome || name).trim();
  if (!nomeMeta) {
    throw new Error("Template WhatsApp sem nome Meta configurado.");
  }

  return {
    id: String(row.id),
    nome: String(row.nome || nomeMeta),
    nomeMeta,
    idioma: String(row.idioma || "pt_BR").trim() || "pt_BR",
    categoriaMeta: row.categoria_meta ? String(row.categoria_meta) : null,
    tipoInterno: row.tipo_interno ? String(row.tipo_interno) : null,
    conteudo: String(row.conteudo || ""),
    variaveis: row.variaveis_json || [],
  };
}

export async function sendManualMarketingWhatsApp({
  idSalao,
  destino,
  mensagem,
  tipo = "manual",
  tipoInterno,
  template = null,
  templateVariables,
  idAgendamento = null,
  idempotencyKey = null,
}: SendManualMarketingWhatsAppParams) {
  await assertCanMutatePlanFeature(idSalao, "whatsapp");

  const supabaseAdmin = getSupabaseAdmin();
  const destinoNormalizado = normalizeDestino(destino);
  const envioId = randomUUID();
  const templateConfig = await loadWhatsAppTemplateConfig(supabaseAdmin, template);
  const templateValues = normalizeTemplateValues(templateVariables);
  const tipoInternoResolvido =
    templateConfig?.tipoInterno || resolveTipoInterno(tipo, tipoInterno);
  const templateNomeMeta = templateConfig?.nomeMeta || template || null;
  const mensagemNormalizada = templateConfig
    ? normalizeMensagem(mensagem || renderTemplateMessage(templateConfig, templateValues))
    : normalizeMensagem(mensagem || "");
  const idempotency =
    String(idempotencyKey || "").trim() || `whatsapp_envio:${envioId}`;

  if (!destinoNormalizado) {
    throw new Error("Numero de destino obrigatorio.");
  }

  if (templateConfig) {
    const expectedVariables = getTemplateVariableCount(templateConfig.variaveis);
    const missingVariable = Array.from({ length: expectedVariables }).some(
      (_, index) => !templateValues[index]
    );

    if (missingVariable) {
      throw new Error(
        `Template ${templateConfig.nomeMeta} exige ${expectedVariables} variavel(is).`
      );
    }
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
        template: templateNomeMeta,
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
            template: templateNomeMeta,
            template_variables: templateValues,
          },
          template_config: templateConfig
            ? {
                id: templateConfig.id,
                nome: templateConfig.nome,
                nome_meta: templateConfig.nomeMeta,
                idioma: templateConfig.idioma,
              }
            : null,
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
            template: templateNomeMeta,
            template_variables: templateValues,
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

    const providerResult = (templateConfig
      ? await sendMetaWhatsAppTemplateMessage({
          to: destinoNormalizado,
          name: templateConfig.nomeMeta,
          languageCode: templateConfig.idioma,
          bodyParameters: templateValues,
        })
      : await sendMetaWhatsAppTextMessage({
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
            template: templateNomeMeta,
            template_variables: templateValues,
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
            template: templateNomeMeta,
          } as Json,
        })
        .eq("id", envioId);
    }

    throw new Error(errorMessage);
  }
}
