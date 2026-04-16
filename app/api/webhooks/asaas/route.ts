import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { addDays, isAfter } from "date-fns";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyHeaderSecret } from "@/lib/auth/verify-secret";

type PlanoSaasRow = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
  ativo: boolean;
};

type WebhookRegistroRow = {
  id: string;
  should_process: boolean;
  status_processamento: string;
  tentativas: number;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function validarTokenWebhook(req: Request) {
  const tokenHeader =
    req.headers.get("asaas-access-token") ||
    req.headers.get("access_token");

  return verifyHeaderSecret(tokenHeader, process.env.ASAAS_WEBHOOK_TOKEN);
}

function shouldActivateAccess(event: string, billingType?: string | null) {
  const type = String(billingType || "").toUpperCase();
  const paidEvents = [
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_RECEIVED_IN_CASH",
  ];

  if (type === "CREDIT_CARD") {
    return paidEvents.includes(event);
  }

  if (type === "BOLETO") {
    return paidEvents.includes(event);
  }

  if (type === "PIX") {
    return paidEvents.includes(event);
  }

  return paidEvents.includes(event);
}

function mapAsaasStatusToInternal(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(normalized)) {
    return "ativo";
  }

  if (["PENDING"].includes(normalized)) {
    return "pendente";
  }

  if (["OVERDUE"].includes(normalized)) {
    return "vencida";
  }

  if (
    [
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
    ].includes(normalized)
  ) {
    return "cancelada";
  }

  return "pendente";
}

function toMiddayIso(dateOnly?: string | null) {
  if (!dateOnly) return null;

  const value = String(dateOnly).trim();
  if (!value) return null;

  const iso = new Date(`${value}T12:00:00`);
  if (Number.isNaN(iso.getTime())) return null;

  return iso.toISOString();
}

function buildWebhookFingerprint(
  event: string,
  payment: Record<string, unknown>
) {
  const fingerprintSource = JSON.stringify({
    event,
    paymentId: String(payment.id || ""),
    status: String(payment.status || ""),
    billingType: String(payment.billingType || ""),
    confirmedDate: String(payment.confirmedDate || ""),
    paymentDate: String(payment.paymentDate || ""),
    clientPaymentDate: String(payment.clientPaymentDate || ""),
    dueDate: String(payment.dueDate || ""),
    deleted: Boolean(payment.deleted),
    value: String(payment.value || ""),
  });

  return createHash("sha256").update(fingerprintSource).digest("hex");
}

async function atualizarStatusEventoWebhook(
  supabaseAdmin: SupabaseClient,
  webhookEventId: string | null,
  statusProcessamento: "processado" | "erro",
  errorMessage?: string | null
) {
  if (!webhookEventId) return;

  const agoraIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status_processamento: statusProcessamento,
    erro_mensagem: errorMessage || null,
    updated_at: agoraIso,
  };

  if (statusProcessamento === "processado") {
    payload.processado_em = agoraIso;
  }

  const { error } = await supabaseAdmin
    .from("asaas_webhook_eventos")
    .update(payload)
    .eq("id", webhookEventId);

  if (error) {
    console.error("Erro ao atualizar log do webhook Asaas:", error);
  }
}

export async function POST(req: Request) {
  let supabaseAdmin: SupabaseClient | null = null;
  let webhookEventId: string | null = null;

  try {
    supabaseAdmin = getSupabaseAdmin();

    if (!validarTokenWebhook(req)) {
      return NextResponse.json(
        { error: "Webhook nao autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const event = String(body?.event || "");
    const payment = body?.payment as Record<string, unknown> | undefined;

    if (!payment?.id) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "no_payment_id",
      });
    }

    const paymentId = String(payment.id);
    const billingType = String(payment.billingType || "").toUpperCase() || null;
    const paymentStatus = String(payment.status || "").toUpperCase();
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const webhookFingerprint = buildWebhookFingerprint(event, payment);

    const { data: webhookRegistroData, error: webhookRegistroError } =
      await supabaseAdmin.rpc("fn_registrar_asaas_webhook_evento", {
        p_fingerprint: webhookFingerprint,
        p_evento: event,
        p_payment_id: paymentId,
        p_payment_status: paymentStatus || null,
        p_payload: body,
      });

    if (webhookRegistroError) {
      console.error("Erro ao registrar evento do webhook:", webhookRegistroError);
      return NextResponse.json(
        { error: "Erro ao registrar evento do webhook." },
        { status: 500 }
      );
    }

    const webhookRegistro = Array.isArray(webhookRegistroData)
      ? (webhookRegistroData[0] as WebhookRegistroRow | undefined)
      : (webhookRegistroData as WebhookRegistroRow | null);

    webhookEventId = webhookRegistro?.id || null;

    if (!webhookRegistro?.should_process) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason:
          webhookRegistro?.status_processamento === "processado"
            ? "duplicate_event"
            : "event_in_processing",
        event,
      });
    }

    const { data: cobranca, error: cobrancaError } = await supabaseAdmin
      .from("assinaturas_cobrancas")
      .select(`
        id,
        id_salao,
        id_assinatura,
        id_plano,
        valor,
        status,
        forma_pagamento,
        asaas_payment_id,
        data_expiracao,
        referencia,
        payment_date,
        confirmed_date,
        plano_origem,
        plano_destino,
        tipo_movimento,
        gerada_automaticamente
      `)
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (cobrancaError) {
      console.error("Erro ao buscar cobranca:", cobrancaError);
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao buscar cobranca."
      );
      return NextResponse.json(
        { error: "Erro ao buscar cobranca." },
        { status: 500 }
      );
    }

    if (!cobranca) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "charge_not_found"
      );
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "charge_not_found",
      });
    }

    if (!cobranca.id_assinatura) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Cobranca sem id_assinatura vinculado."
      );
      return NextResponse.json(
        { error: "Cobranca sem id_assinatura vinculada." },
        { status: 500 }
      );
    }

    const { data: assinatura, error: assinaturaError } = await supabaseAdmin
      .from("assinaturas")
      .select(`
        id,
        id_salao,
        plano,
        status,
        valor,
        vencimento_em,
        trial_ativo,
        trial_inicio_em,
        trial_fim_em,
        limite_profissionais,
        limite_usuarios,
        created_at
      `)
      .eq("id", cobranca.id_assinatura)
      .maybeSingle();

    if (assinaturaError || !assinatura) {
      console.error("Erro ao buscar assinatura:", assinaturaError);
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao buscar assinatura."
      );
      return NextResponse.json(
        { error: "Erro ao buscar assinatura." },
        { status: 500 }
      );
    }

    let plano: PlanoSaasRow | null = null;

    if (cobranca.id_plano) {
      const { data: planoData, error: planoError } = await supabaseAdmin
        .from("planos_saas")
        .select(`
          id,
          codigo,
          nome,
          descricao,
          valor_mensal,
          limite_usuarios,
          limite_profissionais,
          ativo
        `)
        .eq("id", cobranca.id_plano)
        .eq("ativo", true)
        .maybeSingle();

      if (planoError) {
        console.error("Erro ao buscar plano no webhook:", planoError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao buscar plano."
        );
        return NextResponse.json(
          { error: "Erro ao buscar plano." },
          { status: 500 }
        );
      }

      plano = (planoData as PlanoSaasRow | null) || null;
    }

    const statusCobrancaInterno = mapAsaasStatusToInternal(paymentStatus);
    const isEventoPago = shouldActivateAccess(event, billingType);
    const cobrancaJaConfirmada =
      String(cobranca.status || "").toLowerCase() === "ativo";
    const eventoRegressivo =
      event === "PAYMENT_OVERDUE" ||
      event === "PAYMENT_RESTORED" ||
      event === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
      event === "PAYMENT_BANK_SLIP_CANCELLED" ||
      event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED";

    if (cobrancaJaConfirmada && eventoRegressivo) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "processado"
      );
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason:
          "Evento regressivo ignorado porque a cobranca ja esta confirmada.",
        event,
      });
    }

    const confirmedDateIso = isEventoPago
      ? toMiddayIso(String(payment.confirmedDate || "")) ||
        toMiddayIso(String(payment.paymentDate || "")) ||
        toMiddayIso(String(payment.clientPaymentDate || "")) ||
        cobranca.confirmed_date ||
        agoraIso
      : toMiddayIso(String(payment.confirmedDate || "")) ||
        cobranca.confirmed_date ||
        null;

    const paymentDateIso = isEventoPago
      ? toMiddayIso(String(payment.clientPaymentDate || "")) ||
        toMiddayIso(String(payment.paymentDate || "")) ||
        toMiddayIso(String(payment.confirmedDate || "")) ||
        cobranca.payment_date ||
        agoraIso
      : toMiddayIso(String(payment.clientPaymentDate || "")) ||
        toMiddayIso(String(payment.paymentDate || "")) ||
        cobranca.payment_date ||
        null;

    const { error: updateChargeError } = await supabaseAdmin
      .from("assinaturas_cobrancas")
      .update({
        status: statusCobrancaInterno,
        forma_pagamento: billingType || cobranca.forma_pagamento,
        confirmed_date: confirmedDateIso,
        payment_date: paymentDateIso,
        bank_slip_url: payment.bankSlipUrl || null,
        invoice_url: payment.invoiceUrl || null,
        webhook_last_event: event,
        webhook_payload: body,
        deleted: Boolean(payment.deleted),
      })
      .eq("id", cobranca.id);

    if (updateChargeError) {
      console.error("Erro ao atualizar cobranca:", updateChargeError);
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        "Erro ao atualizar cobranca."
      );
      return NextResponse.json(
        { error: "Erro ao atualizar cobranca." },
        { status: 500 }
      );
    }

    if (isEventoPago) {
      let baseDate = agora;

      if (assinatura.vencimento_em) {
        const vencimentoAtual = new Date(`${assinatura.vencimento_em}T23:59:59`);

        if (
          !Number.isNaN(vencimentoAtual.getTime()) &&
          isAfter(vencimentoAtual, agora)
        ) {
          baseDate = vencimentoAtual;
        }
      } else if (assinatura.trial_fim_em) {
        const trialFimAtual = new Date(assinatura.trial_fim_em);

        if (
          !Number.isNaN(trialFimAtual.getTime()) &&
          isAfter(trialFimAtual, agora)
        ) {
          baseDate = trialFimAtual;
        }
      }

      const novoFim = addDays(baseDate, 30);
      const novoVencimentoBanco = novoFim.toISOString().slice(0, 10);

      const planoCodigoFinal = plano?.codigo || assinatura.plano || null;
      const valorPlanoFinal =
        plano != null
          ? Number(plano.valor_mensal || 0)
          : Number(assinatura.valor || 0);
      const limiteUsuariosFinal =
        plano != null
          ? Number(plano.limite_usuarios || 0)
          : Number(assinatura.limite_usuarios || 0);
      const limiteProfissionaisFinal =
        plano != null
          ? Number(plano.limite_profissionais || 0)
          : Number(assinatura.limite_profissionais || 0);

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "ativo",
          plano: planoCodigoFinal,
          valor: valorPlanoFinal,
          pago_em: paymentDateIso || agoraIso,
          vencimento_em: novoVencimentoBanco,
          trial_ativo: false,
          trial_inicio_em: null,
          trial_fim_em: null,
          limite_profissionais: limiteProfissionaisFinal,
          limite_usuarios: limiteUsuariosFinal,
          forma_pagamento_atual: billingType || cobranca.forma_pagamento,
          gateway: "asaas",
          asaas_payment_id: paymentId,
          referencia_atual: cobranca.referencia || paymentId,
          id_cobranca_atual: cobranca.id,
        })
        .eq("id", assinatura.id);

      if (updateAssinaturaError) {
        console.error("Erro ao atualizar assinatura:", updateAssinaturaError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar assinatura."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar assinatura." },
          { status: 500 }
        );
      }

      const { error: updateSalaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          status: "ativo",
          plano: planoCodigoFinal,
          trial_ativo: false,
          trial_inicio_em: null,
          trial_fim_em: null,
          limite_profissionais: limiteProfissionaisFinal,
          limite_usuarios: limiteUsuariosFinal,
          updated_at: agoraIso,
        })
        .eq("id", assinatura.id_salao);

      if (updateSalaoError) {
        console.error("Erro ao atualizar salao:", updateSalaoError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar salao."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar salao." },
          { status: 500 }
        );
      }

      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "processado"
      );
      return NextResponse.json({ ok: true, updated: "paid" });
    }

    if (
      event === "PAYMENT_OVERDUE" ||
      event === "PAYMENT_DELETED" ||
      event === "PAYMENT_RESTORED" ||
      event === "PAYMENT_REFUNDED" ||
      event === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
      event === "PAYMENT_BANK_SLIP_CANCELLED" ||
      event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
    ) {
      let novoStatus = assinatura.status || "pendente";

      if (event === "PAYMENT_OVERDUE") {
        novoStatus = "vencida";
      }

      if (
        event === "PAYMENT_DELETED" ||
        event === "PAYMENT_REFUNDED" ||
        event === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
        event === "PAYMENT_BANK_SLIP_CANCELLED" ||
        event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
      ) {
        novoStatus = "cancelada";
      }

      if (event === "PAYMENT_RESTORED") {
        novoStatus = "pendente";
      }

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: novoStatus,
          trial_ativo: false,
          id_cobranca_atual: cobranca.id,
        })
        .eq("id", assinatura.id);

      if (updateAssinaturaError) {
        console.error("Erro ao atualizar assinatura:", updateAssinaturaError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar assinatura."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar assinatura." },
          { status: 500 }
        );
      }

      const { error: updateSalaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          status: novoStatus,
          trial_ativo: false,
          updated_at: agoraIso,
        })
        .eq("id", assinatura.id_salao);

      if (updateSalaoError) {
        console.error("Erro ao atualizar salao:", updateSalaoError);
        await atualizarStatusEventoWebhook(
          supabaseAdmin,
          webhookEventId,
          "erro",
          "Erro ao atualizar salao."
        );
        return NextResponse.json(
          { error: "Erro ao atualizar salao." },
          { status: 500 }
        );
      }

      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "processado"
      );
      return NextResponse.json({ ok: true, updated: novoStatus });
    }

    await atualizarStatusEventoWebhook(
      supabaseAdmin,
      webhookEventId,
      "processado"
    );
    return NextResponse.json({ ok: true, ignored: true, event });
  } catch (error) {
    console.error("Erro webhook:", error);

    if (supabaseAdmin) {
      await atualizarStatusEventoWebhook(
        supabaseAdmin,
        webhookEventId,
        "erro",
        error instanceof Error ? error.message : "Erro webhook"
      );
    }

    return NextResponse.json({ error: "Erro webhook" }, { status: 500 });
  }
}
