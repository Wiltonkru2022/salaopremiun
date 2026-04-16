import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MANAGED_ALERT_TYPES = [
  "checkout_assinatura_erro",
  "checkout_assinatura_processando",
  "webhook_asaas_erro",
  "cobranca_vencida",
  "trial_vencendo",
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

function buildSalaoNameMap(rows: Array<{ id: string; nome?: string | null }>) {
  return new Map(rows.map((row) => [row.id, row.nome || row.id]));
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
  const processingCutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const trialSoonUntil = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000
  ).toISOString();
  const today = now.toISOString().slice(0, 10);

  const [checkoutLocksRes, webhookRes, cobrancasRes, trialsRes, existingAlertsRes] =
    await Promise.all([
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
  const existingAlerts =
    (existingAlertsRes.data as
      | Array<{
          id: string;
          chave?: string | null;
          tipo?: string | null;
        }>
      | null) || [];

  const salaoIds = Array.from(
    new Set(
      [
        ...checkoutLocks.map((row) => row.id_salao).filter(Boolean),
        ...webhookRows.map((row) => row.id_salao).filter(Boolean),
        ...cobrancasVencidas.map((row) => row.id_salao).filter(Boolean),
        ...trials.map((row) => row.id_salao).filter(Boolean),
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

  if (candidates.length > 0) {
    const { error } = await supabase
      .from("alertas_sistema")
      .upsert(candidates, { onConflict: "chave" });

    if (error) {
      throw new Error(error.message || "Erro ao sincronizar alertas do AdminMaster.");
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
  };
}
