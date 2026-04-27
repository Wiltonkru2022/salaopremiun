import {
  getAdminMasterOperationalSnapshot,
  type AdminHealthOverview,
} from "@/lib/admin-master/operability";
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

type AlertPayload = Record<string, unknown>;

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

function normalizeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isOpaqueServerComponentMessage(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.includes("an error occurred in the server components render") &&
    normalized.includes("digest property")
  );
}

function buildAlertTitle(params: {
  titulo?: string | null;
  tipo?: string | null;
  payload?: AlertPayload | null;
}) {
  if (!isOpaqueServerComponentMessage(params.titulo)) {
    return normalizeText(params.titulo || params.tipo || "Alerta");
  }

  const route = normalizeText(
    params.payload?.route || params.payload?.screen || params.payload?.surface,
    ""
  );
  const action = normalizeText(
    params.payload?.action || params.payload?.eventType || params.tipo,
    ""
  );

  if (route) {
    return `Falha de render em ${route}`;
  }

  if (action) {
    return `Falha de render em ${action}`;
  }

  return "Falha opaca de Server Component";
}

function buildAlertSubtitle(params: {
  descricao?: string | null;
  origem_modulo?: string | null;
  payload?: AlertPayload | null;
}) {
  if (!isOpaqueServerComponentMessage(params.descricao)) {
    return normalizeText(params.descricao || params.origem_modulo || "-");
  }

  const route = normalizeText(
    params.payload?.route || params.payload?.screen || params.payload?.surface,
    ""
  );
  const action = normalizeText(
    params.payload?.action || params.payload?.eventType || params.origem_modulo,
    ""
  );
  const digest = normalizeText(
    params.payload?.digest || params.payload?.errorDigest || params.payload?.errorCode,
    ""
  );

  return (
    [route ? `Local ${route}` : null, action ? `acao ${action}` : null, digest ? `digest ${digest}` : null]
      .filter(Boolean)
      .join(" - ") || "Erro opaco registrado em producao"
  );
}

function statusFromOperationalHealth(health: AdminHealthOverview): Pick<
  AdminMasterHealthCenter,
  "statusLabel" | "statusTone" | "summary"
> {
  if (health.status === "green") {
    return {
      statusLabel: health.label,
      statusTone: "green",
      summary: health.summary,
    };
  }

  if (health.status === "yellow") {
    return {
      statusLabel: health.label,
      statusTone: "amber",
      summary: health.summary,
    };
  }

  if (health.status === "orange") {
    return {
      statusLabel: health.label,
      statusTone: "amber",
      summary: health.summary,
    };
  }

  return {
    statusLabel: health.label,
    statusTone: "red",
    summary: health.summary,
  };
}

export async function getAdminMasterHealthCenter(): Promise<AdminMasterHealthCenter> {
  return runAdminOperation({
    action: "admin_master_health_center",
    run: async (supabase) => {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [
    operational,
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
    getAdminMasterOperationalSnapshot(),
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
      .in("status", ["erro", "expirado"])
      .gte("updated_at", last24h),
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
      .in("gravidade", ["alta", "critica"])
      .gte("atualizado_em", last24h),
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
      .select("id, tipo, gravidade, titulo, descricao, origem_modulo, criado_em, payload_json")
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
      const score = operational.health.score;
      const status = statusFromOperationalHealth(operational.health);

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
            "Nenhum incidente critico ativo agora. Continue acompanhando webhooks e cobrancas.",
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
      payload_json?: AlertPayload | null;
    }[]).map((row) => ({
      id: row.id || `${row.tipo}-${row.criado_em}`,
      title: buildAlertTitle({
        titulo: row.titulo,
        tipo: row.tipo,
        payload: row.payload_json,
      }),
      subtitle: buildAlertSubtitle({
        descricao: row.descricao,
        origem_modulo: row.origem_modulo,
        payload: row.payload_json,
      }),
      status: row.gravidade || "-",
      when: dateTimeValue(row.criado_em),
      href: "/admin-master/alertas",
      tone: toneFromStatus(row.gravidade),
    })),
      };
    },
  });
}
