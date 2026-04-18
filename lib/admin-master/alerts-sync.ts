import {
  getRenovacaoAutomaticaInfo,
  isPaidChargeStatus,
  isPendingChargeStatus,
} from "@/lib/assinaturas/renovacao-automatica";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MANAGED_ALERT_TYPES = [
  "checkout_assinatura_erro",
  "checkout_assinatura_processando",
  "webhook_asaas_erro",
  "cobranca_vencida",
  "trial_vencendo",
  "renovacao_automatica_invalida",
  "renovacao_automatica_sem_cobranca",
] as const;

type ManagedAlertType = (typeof MANAGED_ALERT_TYPES)[number];

type AlertCandidate = {
  chave: string;
  tipo: ManagedAlertType;
  gravidade: "media" | "alta" | "critica";
  origem_modulo: string;
  id_salao: string | null;
  titulo: string;
  descricao: string;
  payload_json: Record<string, unknown>;
  automatico: boolean;
  resolvido: boolean;
  resolvido_em: null;
  atualizado_em: string;
};

type RenovacaoAssinaturaRow = {
  id: string;
  id_salao?: string | null;
  plano?: string | null;
  status?: string | null;
  vencimento_em?: string | null;
  renovacao_automatica?: boolean | null;
  asaas_customer_id?: string | null;
  forma_pagamento_atual?: string | null;
};

type RenovacaoChargeRow = {
  id: string;
  id_assinatura?: string | null;
  status?: string | null;
  data_expiracao?: string | null;
  created_at?: string | null;
  pago_em?: string | null;
  forma_pagamento?: string | null;
  gerada_automaticamente?: boolean | null;
  tipo_movimento?: string | null;
  asaas_payment_id?: string | null;
};

function dateTimeValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function dateValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function daysUntil(value?: string | null) {
  if (!value) return null;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function buildSalaoNameMap(rows: Array<{ id: string; nome?: string | null }>) {
  return new Map(rows.map((row) => [row.id, row.nome || row.id]));
}

function getRenewalIssueLabel(code: string) {
  if (code === "missing_customer") {
    return "a assinatura ainda nao tem customer do Asaas vinculado";
  }

  if (code === "missing_payment_method") {
    return "a forma de pagamento atual ainda nao foi definida";
  }

  if (code === "credit_card_requires_tokenization") {
    return "o cartao ainda depende de tokenizacao para a recorrencia";
  }

  if (code === "unsupported_payment_method") {
    return "a forma atual nao e compativel com PIX ou boleto";
  }

  return "a renovacao automatica ainda nao esta pronta";
}

function hasChargeCoverage(
  charges: RenovacaoChargeRow[],
  today: string,
  recentChargeFrom: number
) {
  return charges.some((charge) => {
    const createdAt = charge.created_at ? new Date(charge.created_at) : null;
    const createdAtMs =
      createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.getTime() : 0;
    const isRecent = createdAtMs >= recentChargeFrom;
    const expiresAfterToday =
      typeof charge.data_expiracao === "string" &&
      charge.data_expiracao >= today;
    const paid = isPaidChargeStatus(charge.status);
    const pending = isPendingChargeStatus(charge.status);

    return (isRecent || expiresAfterToday) && (paid || pending);
  });
}

export async function syncAdminMasterAlerts() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const recentAlertsFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const overdueSince = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const processingCutoff = new Date(
    now.getTime() - 10 * 60 * 1000
  ).toISOString();
  const trialSoonUntil = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000
  ).toISOString();
  const renewalSoonUntil = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
  const recentRenewalChargeFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).getTime();
  const today = now.toISOString().slice(0, 10);

  const [
    checkoutLocksRes,
    webhookRes,
    webhookFallbackRes,
    cobrancasRes,
    trialsRes,
    renewalRes,
    existingAlertsRes,
  ] = await Promise.all([
    supabase
      .from("assinatura_checkout_locks")
      .select(
        "id, id_salao, plano_codigo, billing_type, valor, idempotency_key, status, id_cobranca, asaas_payment_id, erro_texto, expires_at, created_at, updated_at"
      )
      .in("status", ["erro", "expirado", "processando"])
      .gte("created_at", recentAlertsFrom)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("asaas_webhook_eventos")
      .select(
        "id, payment_id, evento, payment_status, status_processamento, tentativas, erro_mensagem, ultimo_recebido_em, id_salao, id_assinatura, id_cobranca, decisao"
      )
      .eq("status_processamento", "erro")
      .gte("ultimo_recebido_em", recentAlertsFrom)
      .order("ultimo_recebido_em", { ascending: false })
      .limit(200),
    supabase
      .from("eventos_webhook")
      .select(
        "id, chave, evento, id_salao, status, payload_json, resposta_json, erro_texto, tentativas, recebido_em, processado_em, automatico"
      )
      .eq("origem", "asaas")
      .eq("status", "erro")
      .eq("automatico", true)
      .gte("recebido_em", recentAlertsFrom)
      .order("recebido_em", { ascending: false })
      .limit(200),
    supabase
      .from("assinaturas_cobrancas")
      .select(
        "id, id_salao, referencia, valor, status, forma_pagamento, data_expiracao, created_at"
      )
      .in("status", ["pending", "pendente", "aguardando_pagamento"])
      .lt("data_expiracao", today)
      .gte("created_at", overdueSince)
      .order("data_expiracao", { ascending: true })
      .limit(200),
    supabase
      .from("assinaturas")
      .select("id, id_salao, plano, status, trial_fim_em")
      .in("status", ["teste_gratis", "trial"])
      .not("trial_fim_em", "is", null)
      .gte("trial_fim_em", nowIso)
      .lte("trial_fim_em", trialSoonUntil)
      .order("trial_fim_em", { ascending: true })
      .limit(200),
    supabase
      .from("assinaturas")
      .select(
        "id, id_salao, plano, status, vencimento_em, renovacao_automatica, asaas_customer_id, forma_pagamento_atual"
      )
      .in("status", ["ativo", "ativa", "pago"])
      .eq("renovacao_automatica", true)
      .not("vencimento_em", "is", null)
      .gte("vencimento_em", today)
      .lte("vencimento_em", renewalSoonUntil)
      .order("vencimento_em", { ascending: true })
      .limit(300),
    supabase
      .from("alertas_sistema")
      .select("id, chave, tipo")
      .eq("automatico", true)
      .eq("resolvido", false)
      .in("tipo", [...MANAGED_ALERT_TYPES]),
  ]);

  const checkoutLocks =
    (checkoutLocksRes.data as
      | Array<{
          id: string;
          id_salao?: string | null;
          plano_codigo?: string | null;
          billing_type?: string | null;
          valor?: number | string | null;
          idempotency_key?: string | null;
          status?: string | null;
          id_cobranca?: string | null;
          asaas_payment_id?: string | null;
          erro_texto?: string | null;
          expires_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        }>
      | null) || [];
  const webhookRows =
    (webhookRes.data as
      | Array<{
          id: string;
          payment_id?: string | null;
          evento?: string | null;
          payment_status?: string | null;
          status_processamento?: string | null;
          tentativas?: number | null;
          erro_mensagem?: string | null;
          ultimo_recebido_em?: string | null;
          id_salao?: string | null;
          id_assinatura?: string | null;
          id_cobranca?: string | null;
          decisao?: string | null;
        }>
      | null) || [];
  const cobrancasVencidas =
    (cobrancasRes.data as
      | Array<{
          id: string;
          id_salao?: string | null;
          referencia?: string | null;
          valor?: number | string | null;
          status?: string | null;
          forma_pagamento?: string | null;
          data_expiracao?: string | null;
          created_at?: string | null;
        }>
      | null) || [];
  const webhookFallbackRows =
    (webhookFallbackRes.data as
      | Array<{
          id: string;
          chave?: string | null;
          evento?: string | null;
          id_salao?: string | null;
          status?: string | null;
          payload_json?: Record<string, unknown> | null;
          resposta_json?: Record<string, unknown> | null;
          erro_texto?: string | null;
          tentativas?: number | null;
          recebido_em?: string | null;
          processado_em?: string | null;
          automatico?: boolean | null;
        }>
      | null) || [];
  const trials =
    (trialsRes.data as
      | Array<{
          id: string;
          id_salao?: string | null;
          plano?: string | null;
          status?: string | null;
          trial_fim_em?: string | null;
        }>
      | null) || [];
  const renewalRows =
    (renewalRes.data as RenovacaoAssinaturaRow[] | null) || [];
  const existingAlerts =
    (existingAlertsRes.data as
      | Array<{
          id: string;
          chave?: string | null;
          tipo?: string | null;
        }>
      | null) || [];

  const renewalIds = renewalRows.map((row) => row.id);
  const { data: renewalChargesData } = renewalIds.length
    ? await supabase
        .from("assinaturas_cobrancas")
        .select(
          "id, id_assinatura, status, data_expiracao, created_at, pago_em, forma_pagamento, gerada_automaticamente, tipo_movimento, asaas_payment_id"
        )
        .in("id_assinatura", renewalIds)
        .gte(
          "created_at",
          new Date(recentRenewalChargeFrom).toISOString()
        )
        .order("created_at", { ascending: false })
        .limit(800)
    : { data: [] as RenovacaoChargeRow[] };

  const renewalCharges = (renewalChargesData as RenovacaoChargeRow[] | null) || [];
  const renewalChargesByAssinatura = new Map<string, RenovacaoChargeRow[]>();

  renewalCharges.forEach((charge) => {
    if (!charge.id_assinatura) return;
    const current = renewalChargesByAssinatura.get(charge.id_assinatura) || [];
    current.push(charge);
    renewalChargesByAssinatura.set(charge.id_assinatura, current);
  });

  const salaoIds = Array.from(
    new Set(
      [
        ...checkoutLocks.map((row) => row.id_salao).filter(Boolean),
        ...webhookRows.map((row) => row.id_salao).filter(Boolean),
        ...webhookFallbackRows.map((row) => row.id_salao).filter(Boolean),
        ...cobrancasVencidas.map((row) => row.id_salao).filter(Boolean),
        ...trials.map((row) => row.id_salao).filter(Boolean),
        ...renewalRows.map((row) => row.id_salao).filter(Boolean),
      ] as string[]
    )
  );

  const { data: saloes } = salaoIds.length
    ? await supabase
        .from("saloes")
        .select("id, nome")
        .in("id", salaoIds)
        .limit(salaoIds.length)
    : { data: [] as Array<{ id: string; nome?: string | null }> };

  const salaoNameById = buildSalaoNameMap(
    ((saloes as Array<{ id: string; nome?: string | null }>) || [])
  );

  const candidates: AlertCandidate[] = [];

  checkoutLocks.forEach((lock) => {
    const status = normalizeString(lock.status).toLowerCase();
    const isSlowProcessing =
      status === "processando" &&
      Boolean(lock.created_at) &&
      new Date(String(lock.created_at)).getTime() <=
        new Date(processingCutoff).getTime();

    if (!["erro", "expirado"].includes(status) && !isSlowProcessing) {
      return;
    }

    const salaoNome = lock.id_salao
      ? salaoNameById.get(lock.id_salao) || lock.id_salao
      : "Salao sem vinculo";
    const tipo: ManagedAlertType = isSlowProcessing
      ? "checkout_assinatura_processando"
      : "checkout_assinatura_erro";
    const titulo = isSlowProcessing
      ? "Checkout de assinatura travado"
      : "Checkout de assinatura com falha";
    const descricao = isSlowProcessing
      ? `${salaoNome} esta com checkout em processamento desde ${dateTimeValue(
          lock.created_at
        )}.`
      : `${salaoNome} teve checkout ${status} em ${dateTimeValue(
          lock.updated_at || lock.created_at
        )}.`;

    candidates.push({
      chave: `alerta:${tipo}:${lock.id}`,
      tipo,
      gravidade: isSlowProcessing ? "alta" : "critica",
      origem_modulo: "assinaturas",
      id_salao: lock.id_salao || null,
      titulo,
      descricao,
      payload_json: {
        fonte: "assinatura_checkout_locks",
        lock_id: lock.id,
        idempotency_key: lock.idempotency_key || null,
        plano_codigo: lock.plano_codigo || null,
        billing_type: lock.billing_type || null,
        valor: numberValue(lock.valor),
        status,
        id_cobranca: lock.id_cobranca || null,
        asaas_payment_id: lock.asaas_payment_id || null,
        erro_texto: lock.erro_texto || null,
        criado_em: lock.created_at || null,
        atualizado_em: lock.updated_at || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: nowIso,
    });
  });

  webhookRows.forEach((row) => {
    const salaoNome = row.id_salao
      ? salaoNameById.get(row.id_salao) || row.id_salao
      : "Salao nao identificado";

    candidates.push({
      chave: `alerta:webhook_asaas_erro:${row.id}`,
      tipo: "webhook_asaas_erro",
      gravidade: Number(row.tentativas || 0) >= 3 ? "critica" : "alta",
      origem_modulo: "webhooks",
      id_salao: row.id_salao || null,
      titulo: "Webhook Asaas com erro",
      descricao: `${salaoNome} recebeu evento ${row.evento || "-"} com erro em ${dateTimeValue(
        row.ultimo_recebido_em
      )}.`,
      payload_json: {
        fonte: "asaas_webhook_eventos",
        webhook_id: row.id,
        payment_id: row.payment_id || null,
        evento: row.evento || null,
        payment_status: row.payment_status || null,
        tentativas: Number(row.tentativas || 0),
        erro_mensagem: row.erro_mensagem || null,
        decisao: row.decisao || null,
        ultimo_recebido_em: row.ultimo_recebido_em || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: nowIso,
    });
  });

  webhookFallbackRows
    .filter((row) => {
      const payload =
        row.payload_json && typeof row.payload_json === "object"
          ? row.payload_json
          : {};

      return (
        normalizeString(payload.origem_registro) ===
        "fallback_webhook_registration_error"
      );
    })
    .forEach((row) => {
      const salaoNome = row.id_salao
        ? salaoNameById.get(row.id_salao) || row.id_salao
        : "Salao nao identificado";
      const payload =
        row.payload_json && typeof row.payload_json === "object"
          ? row.payload_json
          : {};

      candidates.push({
        chave: `alerta:webhook_asaas_fallback:${row.chave || row.id}`,
        tipo: "webhook_asaas_erro",
        gravidade: "critica",
        origem_modulo: "webhooks",
        id_salao: row.id_salao || null,
        titulo: "Webhook Asaas falhou antes do registro",
        descricao: `${salaoNome} recebeu evento ${row.evento || "-"} com falha antes de persistir em ${dateTimeValue(
          row.recebido_em
        )}.`,
        payload_json: {
          fonte: "eventos_webhook",
          webhook_id: row.id,
          chave: row.chave || null,
          payment_id: normalizeString(payload.payment_id) || null,
          payment_status: normalizeString(payload.payment_status) || null,
          erro_mensagem: row.erro_texto || null,
          recebido_em: row.recebido_em || null,
        },
        automatico: true,
        resolvido: false,
        resolvido_em: null,
        atualizado_em: nowIso,
      });
    });

  cobrancasVencidas.forEach((row) => {
    const salaoNome = row.id_salao
      ? salaoNameById.get(row.id_salao) || row.id_salao
      : "Salao nao identificado";

    candidates.push({
      chave: `alerta:cobranca_vencida:${row.id}`,
      tipo: "cobranca_vencida",
      gravidade: "alta",
      origem_modulo: "financeiro",
      id_salao: row.id_salao || null,
      titulo: "Cobranca vencida aguardando pagamento",
      descricao: `${salaoNome} esta com cobranca vencida desde ${dateValue(
        row.data_expiracao
      )}.`,
      payload_json: {
        fonte: "assinaturas_cobrancas",
        id_cobranca: row.id,
        referencia: row.referencia || null,
        valor: numberValue(row.valor),
        status: row.status || null,
        forma_pagamento: row.forma_pagamento || null,
        data_expiracao: row.data_expiracao || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: nowIso,
    });
  });

  trials.forEach((row) => {
    const salaoNome = row.id_salao
      ? salaoNameById.get(row.id_salao) || row.id_salao
      : "Salao nao identificado";

    candidates.push({
      chave: `alerta:trial_vencendo:${row.id}`,
      tipo: "trial_vencendo",
      gravidade: "media",
      origem_modulo: "growth",
      id_salao: row.id_salao || null,
      titulo: "Trial terminando em breve",
      descricao: `${salaoNome} encerra o trial em ${dateTimeValue(
        row.trial_fim_em
      )}.`,
      payload_json: {
        fonte: "assinaturas",
        id_assinatura: row.id,
        plano: row.plano || null,
        status: row.status || null,
        trial_fim_em: row.trial_fim_em || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: nowIso,
    });
  });

  renewalRows.forEach((row) => {
    const salaoNome = row.id_salao
      ? salaoNameById.get(row.id_salao) || row.id_salao
      : "Salao nao identificado";
    const diasParaVencer = daysUntil(row.vencimento_em);
    const renovacaoInfo = getRenovacaoAutomaticaInfo({
      assinaturaExiste: true,
      asaasCustomerId: row.asaas_customer_id,
      formaPagamentoAtual: row.forma_pagamento_atual,
      renovacaoAutomatica: true,
    });
    const charges = renewalChargesByAssinatura.get(row.id) || [];
    const pendingCharges = charges.filter((charge) =>
      isPendingChargeStatus(charge.status)
    );
    const latestCharge = charges[0] || null;
    const hasCoverage = hasChargeCoverage(
      charges,
      today,
      recentRenewalChargeFrom
    );

    if (!renovacaoInfo.estaProntaParaCobranca) {
      candidates.push({
        chave: `alerta:renovacao_automatica_invalida:${row.id}`,
        tipo: "renovacao_automatica_invalida",
        gravidade:
          typeof diasParaVencer === "number" && diasParaVencer <= 1
            ? "critica"
            : "alta",
        origem_modulo: "assinaturas",
        id_salao: row.id_salao || null,
        titulo: "Renovacao automatica sem preparo",
        descricao: `${salaoNome} vence em ${dateValue(
          row.vencimento_em
        )}, mas ${getRenewalIssueLabel(renovacaoInfo.code)}.`,
        payload_json: {
          fonte: "assinaturas",
          id_assinatura: row.id,
          plano: row.plano || null,
          status: row.status || null,
          vencimento_em: row.vencimento_em || null,
          dias_para_vencer: diasParaVencer,
          renovacao_automatica: true,
          renovacao_code: renovacaoInfo.code,
          renovacao_observacao: renovacaoInfo.observacao,
          erro_ativacao: renovacaoInfo.erroAtivacao,
          forma_pagamento_atual:
            renovacaoInfo.formaPagamentoNormalizada ||
            row.forma_pagamento_atual ||
            null,
          asaas_customer_id: row.asaas_customer_id || null,
        },
        automatico: true,
        resolvido: false,
        resolvido_em: null,
        atualizado_em: nowIso,
      });
      return;
    }

    if (hasCoverage) {
      return;
    }

    candidates.push({
      chave: `alerta:renovacao_automatica_sem_cobranca:${row.id}`,
      tipo: "renovacao_automatica_sem_cobranca",
      gravidade:
        typeof diasParaVencer === "number" && diasParaVencer <= 1
          ? "critica"
          : "alta",
      origem_modulo: "assinaturas",
      id_salao: row.id_salao || null,
      titulo: "Renovacao automatica sem cobranca futura",
      descricao: `${salaoNome} vence em ${dateValue(
        row.vencimento_em
      )} com renovacao pronta, mas ainda sem cobranca recente ou pendente.`,
      payload_json: {
        fonte: "assinaturas",
        id_assinatura: row.id,
        plano: row.plano || null,
        status: row.status || null,
        vencimento_em: row.vencimento_em || null,
        dias_para_vencer: diasParaVencer,
        renovacao_automatica: true,
        forma_pagamento_atual: renovacaoInfo.formaPagamentoNormalizada,
        pending_charge_count: pendingCharges.length,
        latest_charge_id: latestCharge?.id || null,
        latest_charge_status: latestCharge?.status || null,
        latest_charge_expiracao: latestCharge?.data_expiracao || null,
        latest_charge_created_at: latestCharge?.created_at || null,
        latest_charge_payment_id: latestCharge?.asaas_payment_id || null,
      },
      automatico: true,
      resolvido: false,
      resolvido_em: null,
      atualizado_em: nowIso,
    });
  });

  if (candidates.length > 0) {
    const { error } = await supabase
      .from("alertas_sistema")
      .upsert(candidates, { onConflict: "chave" });

    if (error) {
      throw new Error(
        error.message || "Erro ao sincronizar alertas do AdminMaster."
      );
    }
  }

  const activeKeys = new Set(candidates.map((item) => item.chave));
  const staleAlerts = existingAlerts.filter(
    (row) => row.chave && !activeKeys.has(String(row.chave))
  );

  if (staleAlerts.length > 0) {
    const { error } = await supabase
      .from("alertas_sistema")
      .update({
        resolvido: true,
        resolvido_em: nowIso,
        atualizado_em: nowIso,
      })
      .in(
        "id",
        staleAlerts.map((row) => row.id)
      );

    if (error) {
      throw new Error(error.message || "Erro ao resolver alertas antigos.");
    }
  }

  return {
    total: candidates.length,
    checkoutsFalhos: candidates.filter(
      (item) => item.tipo === "checkout_assinatura_erro"
    ).length,
    checkoutsTravados: candidates.filter(
      (item) => item.tipo === "checkout_assinatura_processando"
    ).length,
    webhooksComErro: candidates.filter(
      (item) => item.tipo === "webhook_asaas_erro"
    ).length,
    cobrancasVencidas: candidates.filter(
      (item) => item.tipo === "cobranca_vencida"
    ).length,
    trialsVencendo: candidates.filter(
      (item) => item.tipo === "trial_vencendo"
    ).length,
    renovacoesComConfigInvalida: candidates.filter(
      (item) => item.tipo === "renovacao_automatica_invalida"
    ).length,
    renovacoesSemCobranca: candidates.filter(
      (item) => item.tipo === "renovacao_automatica_sem_cobranca"
    ).length,
  };
}
