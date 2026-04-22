import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type HealthTone = "green" | "amber" | "red" | "blue" | "dark";

export type HealthMetric = {
  label: string;
  value: string;
  hint: string;
  tone: HealthTone;
  href?: string;
};

export type HealthAction = {
  title: string;
  detail: string;
  href: string;
  tone: HealthTone;
};

export type HealthRow = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  when: string;
  href?: string;
  tone: HealthTone;
};

export type AdminMasterHealthCenter = {
  score: number;
  statusLabel: string;
  statusTone: HealthTone;
  summary: string;
  metrics: HealthMetric[];
  actions: HealthAction[];
  webhooks: HealthRow[];
  checkouts: HealthRow[];
  crons: HealthRow[];
  alerts: HealthRow[];
};

type CountResult = {
  count: number | null;
  error: unknown;
};

function safeCount(result: CountResult) {
  return result.error ? 0 : result.count || 0;
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

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function toneFromStatus(status?: string | null): HealthTone {
  const normalized = normalizeStatus(status);
  if (["processado", "sucesso", "ok", "resolvido", "ativo"].includes(normalized)) {
    return "green";
  }
  if (["processando", "pendente", "em_atendimento"].includes(normalized)) {
    return "amber";
  }
  if (["erro", "falha", "expirado", "bloqueado", "critica", "alta"].includes(normalized)) {
    return "red";
  }
  return "blue";
}

function healthScore(params: {
  webhookErrors: number;
  checkoutFailures: number;
  blockedSalons: number;
  criticalAlerts: number;
  cronFailures: number;
}) {
  const penalty =
    params.webhookErrors * 12 +
    params.checkoutFailures * 14 +
    params.blockedSalons * 4 +
    params.criticalAlerts * 10 +
    params.cronFailures * 10;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function statusFromScore(score: number): Pick<
  AdminMasterHealthCenter,
  "statusLabel" | "statusTone" | "summary"
> {
  if (score >= 92) {
    return {
      statusLabel: "Operacao saudavel",
      statusTone: "green",
      summary: "Sem sinais criticos nos principais fluxos SaaS.",
    };
  }

  if (score >= 75) {
    return {
      statusLabel: "Atencao operacional",
      statusTone: "amber",
      summary: "Existe risco moderado. Priorize alertas, cron e checkout.",
    };
  }

  return {
    statusLabel: "Risco alto",
    statusTone: "red",
    summary: "Ha falhas que podem afetar cobranca, acesso ou suporte.",
  };
}

export async function getAdminMasterHealthCenter(): Promise<AdminMasterHealthCenter> {
  return runAdminOperation({
    action: "admin_master_health_center",
    run: async (supabase) => {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [
    webhookErrors,
    webhooksProcessing,
    checkoutFailures,
    checkoutProcessing,
    blockedSalons,
    criticalAlerts,
    cronFailures,
    recentWebhooks,
    recentCheckouts,
    recentCrons,
    recentAlerts,
      ] = await Promise.all([
    supabase
      .from("asaas_webhook_eventos")
      .select("id", { count: "exact", head: true })
      .eq("status_processamento", "erro")
      .gte("updated_at", last24h),
    supabase
      .from("asaas_webhook_eventos")
      .select("id", { count: "exact", head: true })
      .eq("status_processamento", "processando"),
    supabase
      .from("assinatura_checkout_locks")
      .select("id", { count: "exact", head: true })
      .in("status", ["erro", "expirado"]),
    supabase
      .from("assinatura_checkout_locks")
      .select("id", { count: "exact", head: true })
      .eq("status", "processando"),
    supabase
      .from("saloes")
      .select("id", { count: "exact", head: true })
      .eq("status", "bloqueado"),
    supabase
      .from("alertas_sistema")
      .select("id", { count: "exact", head: true })
      .eq("resolvido", false)
      .in("gravidade", ["alta", "critica"]),
    supabase
      .from("eventos_cron")
      .select("id", { count: "exact", head: true })
      .eq("status", "erro")
      .gte("iniciado_em", last24h),
    supabase
      .from("asaas_webhook_eventos")
      .select(
        "id, evento, payment_id, payment_status, status_processamento, erro_mensagem, ultimo_recebido_em, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("assinatura_checkout_locks")
      .select("id, id_salao, plano_codigo, billing_type, status, erro_texto, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("eventos_cron")
      .select("id, nome, status, resumo, erro_texto, iniciado_em, finalizado_em")
      .order("iniciado_em", { ascending: false })
      .limit(8),
    supabase
      .from("alertas_sistema")
      .select("id, tipo, gravidade, titulo, descricao, origem_modulo, criado_em")
      .eq("resolvido", false)
      .order("criado_em", { ascending: false })
      .limit(8),
      ]);

      const counts = {
    webhookErrors: safeCount(webhookErrors),
    webhooksProcessing: safeCount(webhooksProcessing),
    checkoutFailures: safeCount(checkoutFailures),
    checkoutProcessing: safeCount(checkoutProcessing),
    blockedSalons: safeCount(blockedSalons),
    criticalAlerts: safeCount(criticalAlerts),
    cronFailures: safeCount(cronFailures),
      };

      const score = healthScore(counts);
      const status = statusFromScore(score);

      const actions: HealthAction[] = [
    counts.webhookErrors > 0
      ? {
          title: "Reprocessar webhooks com erro",
          detail: `${counts.webhookErrors} webhook(s) falharam nas ultimas 24h.`,
          href: "/admin-master/webhooks",
          tone: "red",
        }
      : null,
    counts.checkoutFailures > 0
      ? {
          title: "Reconciliar checkouts travados",
          detail: `${counts.checkoutFailures} checkout(s) em erro ou expirado.`,
          href: "/admin-master/logs",
          tone: "red",
        }
      : null,
    counts.criticalAlerts > 0
      ? {
          title: "Resolver alertas criticos",
          detail: `${counts.criticalAlerts} alerta(s) de alta prioridade ativos.`,
          href: "/admin-master/alertas",
          tone: "amber",
        }
      : null,
    counts.cronFailures > 0
      ? {
          title: "Auditar cron de renovacao",
          detail: `${counts.cronFailures} falha(s) de cron nas ultimas 24h.`,
          href: "/admin-master/operacao",
          tone: "amber",
        }
      : null,
      ].filter(Boolean) as HealthAction[];

      if (!actions.length) {
        actions.push({
          title: "Manter monitoramento ativo",
          detail:
            "Nenhum incidente critico agora. Continue acompanhando webhooks e cobrancas.",
          href: "/admin-master/operacao",
          tone: "green",
        });
      }

      return {
    score,
    ...status,
    metrics: [
      {
        label: "Webhooks erro 24h",
        value: String(counts.webhookErrors),
        hint: `${counts.webhooksProcessing} em processamento agora`,
        tone: counts.webhookErrors ? "red" : "green",
        href: "/admin-master/webhooks",
      },
      {
        label: "Checkouts risco",
        value: String(counts.checkoutFailures),
        hint: `${counts.checkoutProcessing} processando`,
        tone: counts.checkoutFailures ? "red" : "green",
        href: "/admin-master/logs",
      },
      {
        label: "Saloes bloqueados",
        value: String(counts.blockedSalons),
        hint: "Clientes sem acesso operacional",
        tone: counts.blockedSalons ? "amber" : "green",
        href: "/admin-master/saloes",
      },
      {
        label: "Alertas altos",
        value: String(counts.criticalAlerts),
        hint: "Alertas ativos alta/critica",
        tone: counts.criticalAlerts ? "red" : "green",
        href: "/admin-master/alertas",
      },
      {
        label: "Cron falhou 24h",
        value: String(counts.cronFailures),
        hint: "Renovacoes e jobs internos",
        tone: counts.cronFailures ? "red" : "green",
        href: "/admin-master/operacao",
      },
    ],
    actions,
    webhooks: ((recentWebhooks.data || []) as {
      id?: string | null;
      evento?: string | null;
      payment_id?: string | null;
      payment_status?: string | null;
      status_processamento?: string | null;
      erro_mensagem?: string | null;
      ultimo_recebido_em?: string | null;
      updated_at?: string | null;
    }[]).map((row) => ({
      id: row.id || `${row.evento}-${row.payment_id}`,
      title: row.evento || "Webhook",
      subtitle: row.erro_mensagem || row.payment_id || "-",
      status: row.status_processamento || "-",
      when: dateTimeValue(row.updated_at || row.ultimo_recebido_em),
      href: "/admin-master/webhooks",
      tone: toneFromStatus(row.status_processamento),
    })),
    checkouts: ((recentCheckouts.data || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      status?: string | null;
      erro_texto?: string | null;
      updated_at?: string | null;
    }[]).map((row) => ({
      id: row.id || `${row.id_salao}-${row.updated_at}`,
      title: `${row.plano_codigo || "plano"} / ${row.billing_type || "pagamento"}`,
      subtitle: row.erro_texto || row.id_salao || "-",
      status: row.status || "-",
      when: dateTimeValue(row.updated_at),
      href: "/admin-master/logs",
      tone: toneFromStatus(row.status),
    })),
    crons: ((recentCrons.data || []) as {
      id?: string | null;
      nome?: string | null;
      status?: string | null;
      resumo?: string | null;
      erro_texto?: string | null;
      iniciado_em?: string | null;
      finalizado_em?: string | null;
    }[]).map((row) => ({
      id: row.id || `${row.nome}-${row.iniciado_em}`,
      title: row.nome || "Cron",
      subtitle: row.erro_texto || row.resumo || "-",
      status: row.status || "-",
      when: dateTimeValue(row.finalizado_em || row.iniciado_em),
      href: "/admin-master/operacao",
      tone: toneFromStatus(row.status),
    })),
    alerts: ((recentAlerts.data || []) as {
      id?: string | null;
      tipo?: string | null;
      gravidade?: string | null;
      titulo?: string | null;
      descricao?: string | null;
      origem_modulo?: string | null;
      criado_em?: string | null;
    }[]).map((row) => ({
      id: row.id || `${row.tipo}-${row.criado_em}`,
      title: row.titulo || row.tipo || "Alerta",
      subtitle: row.descricao || row.origem_modulo || "-",
      status: row.gravidade || "-",
      when: dateTimeValue(row.criado_em),
      href: "/admin-master/alertas",
      tone: toneFromStatus(row.gravidade),
    })),
      };
    },
  });
}
