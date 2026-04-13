import { NextResponse } from "next/server";
import { addDays, format, isBefore, subDays } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { criarCobranca } from "@/lib/payments/pix-provider";

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

function validarCron(req: Request) {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
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

export async function GET(req: Request) {
  try {
    if (!validarCron(req)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const hoje = new Date();
    const dataLimite = format(addDays(hoje, 3), "yyyy-MM-dd");

    const { data: assinaturas, error } = await supabaseAdmin
      .from("assinaturas")
      .select(`
        id,
        id_salao,
        plano,
        status,
        vencimento_em,
        asaas_customer_id,
        forma_pagamento_atual
      `)
      .in("status", ["ativo", "ativa", "pago"])
      .lte("vencimento_em", dataLimite);

    if (error) {
      throw error;
    }

    const resultados: Array<Record<string, unknown>> = [];

    for (const assinatura of assinaturas || []) {
      const planoCodigo = String(assinatura.plano || "").toLowerCase();

      if (!planoCodigo) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: "Plano inválido",
        });
        continue;
      }

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
        .eq("codigo", planoCodigo)
        .eq("ativo", true)
        .maybeSingle();

      if (planoError) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: planoError.message,
        });
        continue;
      }

      const plano = planoData as PlanoSaasRow | null;

      if (!plano?.id) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: "Plano não encontrado em planos_saas",
        });
        continue;
      }

      if (!assinatura.asaas_customer_id) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: "Sem asaas_customer_id",
        });
        continue;
      }

      const vencimentoAtual = assinatura.vencimento_em
        ? new Date(`${assinatura.vencimento_em}T23:59:59`)
        : null;

      if (!vencimentoAtual || Number.isNaN(vencimentoAtual.getTime())) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: "Vencimento inválido",
        });
        continue;
      }

      const jaVenceu = isBefore(vencimentoAtual, subDays(hoje, 1));
      if (jaVenceu) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: "Assinatura já vencida",
        });
        continue;
      }

      const formaPagamento =
        String(assinatura.forma_pagamento_atual || "PIX").toUpperCase();

      if (
        formaPagamento !== "PIX" &&
        formaPagamento !== "BOLETO" &&
        formaPagamento !== "CREDIT_CARD"
      ) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: "Forma de pagamento inválida",
        });
        continue;
      }

      const novoVencimentoCobranca = format(addDays(hoje, 1), "yyyy-MM-dd");

      const referencia = `${assinatura.id_salao}-${plano.codigo}-${Date.now()}`;

      const { data: cobrancaExistente } = await supabaseAdmin
        .from("assinaturas_cobrancas")
        .select("id, status, asaas_payment_id, data_expiracao")
        .eq("id_assinatura", assinatura.id)
        .in("status", ["pending", "PENDING", "pendente"])
        .gte("data_expiracao", format(hoje, "yyyy-MM-dd"))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cobrancaExistente) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: true,
          skipped: true,
          motivo: "Já existe cobrança pendente ativa",
          paymentId: cobrancaExistente.asaas_payment_id,
        });
        continue;
      }

      const valorPlano = Number(plano.valor_mensal || 0);

      const cobranca = await criarCobranca({
        customerId: assinatura.asaas_customer_id,
        billingType: formaPagamento as "PIX" | "BOLETO" | "CREDIT_CARD",
        valor: valorPlano,
        descricao: `Renovação ${plano.nome} - SalaoPremium`,
        vencimento: novoVencimentoCobranca,
        referenciaExterna: assinatura.id_salao,
      });

      const { data: cobrancaInserida, error: historicoError } = await supabaseAdmin
        .from("assinaturas_cobrancas")
        .insert({
          id_salao: assinatura.id_salao,
          id_assinatura: assinatura.id,
          id_plano: plano.id,
          referencia,
          descricao: `Renovação ${plano.nome} - SalaoPremium`,
          valor: valorPlano,
          status: String(cobranca.status || "PENDING").toLowerCase(),
          forma_pagamento: formaPagamento,
          gateway: "asaas",
          txid: formaPagamento === "PIX" ? cobranca.id : null,
          data_expiracao: novoVencimentoCobranca,
          external_reference: assinatura.id_salao,
          asaas_customer_id: assinatura.asaas_customer_id,
          asaas_payment_id: cobranca.id,
          bank_slip_url:
            (cobranca as { bankSlipUrl?: string | null }).bankSlipUrl || null,
          invoice_url:
            (cobranca as { invoiceUrl?: string | null }).invoiceUrl || null,
          webhook_payload: cobranca,
          metadata: {
            origem: "cron_renovacao",
            plano: plano.codigo,
            formaPagamento,
          },
        })
        .select("id")
        .single();

      if (historicoError || !cobrancaInserida?.id) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: historicoError?.message || "Erro ao gravar cobrança",
        });
        continue;
      }

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "pendente",
          asaas_payment_id: cobranca.id,
          valor: valorPlano,
          gateway: "asaas",
          forma_pagamento_atual: formaPagamento,
          id_cobranca_atual: cobrancaInserida.id,
          referencia_atual: referencia,
        })
        .eq("id", assinatura.id);

      if (updateAssinaturaError) {
        resultados.push({
          id_salao: assinatura.id_salao,
          ok: false,
          motivo: updateAssinaturaError.message,
        });
        continue;
      }

      resultados.push({
        id_salao: assinatura.id_salao,
        ok: true,
        paymentId: cobranca.id,
        billingType: formaPagamento,
        expiracaoCobranca: novoVencimentoCobranca,
      });
    }

    return NextResponse.json({
      ok: true,
      total: resultados.length,
      resultados,
    });
  } catch (error) {
    console.error("Erro ao renovar assinaturas:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao renovar assinaturas.",
      },
      { status: 500 }
    );
  }
}