import { NextResponse } from "next/server";
import { addDays, isAfter } from "date-fns";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function validarTokenWebhook(req: Request) {
  const tokenHeader =
    req.headers.get("asaas-access-token") ||
    req.headers.get("access_token");

  return tokenHeader === process.env.ASAAS_WEBHOOK_TOKEN;
}

function shouldActivateAccess(event: string, billingType?: string | null) {
  const type = String(billingType || "").toUpperCase();

  if (type === "CREDIT_CARD") {
    return event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
  }

  if (type === "BOLETO") {
    return event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
  }

  if (type === "PIX") {
    return event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED";
  }

  return event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
}

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

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!validarTokenWebhook(req)) {
      return NextResponse.json(
        { error: "Webhook não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const event = String(body?.event || "");
    const payment = body?.payment;

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
        confirmed_date
      `)
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (cobrancaError) {
      console.error("Erro ao buscar cobrança:", cobrancaError);
      return NextResponse.json(
        { error: "Erro ao buscar cobrança." },
        { status: 500 }
      );
    }

    if (!cobranca) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "charge_not_found",
      });
    }

    if (!cobranca.id_assinatura) {
      return NextResponse.json(
        { error: "Cobrança sem id_assinatura vinculado." },
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
        return NextResponse.json(
          { error: "Erro ao buscar plano." },
          { status: 500 }
        );
      }

      plano = (planoData as PlanoSaasRow | null) || null;
    }

    const statusCobrancaInterno = mapAsaasStatusToInternal(paymentStatus);

    const confirmedDateIso = toMiddayIso(payment.confirmedDate);
    const paymentDateIso =
      toMiddayIso(payment.clientPaymentDate) ||
      toMiddayIso(payment.paymentDate) ||
      confirmedDateIso;

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
      console.error("Erro ao atualizar cobrança:", updateChargeError);
      return NextResponse.json(
        { error: "Erro ao atualizar cobrança." },
        { status: 500 }
      );
    }

    if (shouldActivateAccess(event, billingType)) {
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
          pago_em: agoraIso,
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
        console.error("Erro ao atualizar salão:", updateSalaoError);
        return NextResponse.json(
          { error: "Erro ao atualizar salão." },
          { status: 500 }
        );
      }

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
        return NextResponse.json(
          { error: "Erro ao atualizar assinatura." },
          { status: 500 }
        );
      }

      const { error: updateSalaoError } = await supabaseAdmin
        .from("saloes")
        .update({
          updated_at: agoraIso,
        })
        .eq("id", assinatura.id_salao);

      if (updateSalaoError) {
        console.error("Erro ao atualizar salão:", updateSalaoError);
        return NextResponse.json(
          { error: "Erro ao atualizar salão." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, updated: novoStatus });
    }

    return NextResponse.json({ ok: true, ignored: true, event });
  } catch (error) {
    console.error("Erro webhook:", error);
    return NextResponse.json({ error: "Erro webhook" }, { status: 500 });
  }
}