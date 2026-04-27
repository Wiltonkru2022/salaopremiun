import { runAdminOperation } from "@/lib/supabase/admin-ops";

type MonitoringEventRow = {
  id?: string | null;
  id_salao?: string | null;
  modulo?: string | null;
  tipo_evento?: string | null;
  severidade?: string | null;
  mensagem?: string | null;
  rota?: string | null;
  acao?: string | null;
  response_ms?: number | null;
  sucesso?: boolean | null;
  created_at?: string | null;
};

type IncidentRow = {
  id?: string | null;
  titulo?: string | null;
  modulo?: string | null;
  severidade?: string | null;
  status?: string | null;
  impacto_saloes?: number | null;
  total_ocorrencias?: number | null;
  primeira_ocorrencia_em?: string | null;
  ultima_ocorrencia_em?: string | null;
  acao_sugerida?: string | null;
  resolucao_automatica_disponivel?: boolean | null;
};

type HealthCheckRow = {
  chave?: string | null;
  nome?: string | null;
  status?: string | null;
  score?: number | null;
  atualizado_em?: string | null;
};

type SalaoScoreSaudeRow = {
  id_salao?: string | null;
  score_total?: number | null;
  uso_recente?: number | null;
  inadimplencia_risco?: number | null;
  tickets_abertos?: number | null;
  risco_cancelamento?: number | null;
  atualizado_em?: string | null;
};

type SalaoScoreOnboardingRow = {
  id_salao?: string | null;
  score_total?: number | null;
  dias_com_acesso?: number | null;
  modulos_usados?: number | null;
  atualizado_em?: string | null;
};

type SalaoBaseRow = {
  id: string;
  nome?: string | null;
  plano?: string | null;
  status?: string | null;
};

type AssinaturaTrialRow = {
  id_salao?: string | null;
  status?: string | null;
  trial_fim_em?: string | null;
};

type TrialRuleRow = {
  nome?: string | null;
  score_minimo?: number | null;
  dias_extra?: number | null;
  ativo?: boolean | null;
};

type TrialExtensionRow = {
  id_salao?: string | null;
  trial_novo_fim?: string | null;
  score_atingido?: number | null;
  criado_em?: string | null;
};

type AutomaticActionRow = {
  tipo?: string | null;
  referencia?: string | null;
  executada?: boolean | null;
  sucesso?: boolean | null;
  log?: string | null;
  created_at?: string | null;
};

export type AdminHealthOverview = {
  score: number;
  status: "green" | "yellow" | "orange" | "red";
  label: string;
  summary: string;
  errorRate24h: number;
  openIncidents: number;
  impactedSalons: number;
  slowRoutes: number;
  failingCriticalActions: number;
};

export type AdminIncidentSummary = {
  id: string;
  title: string;
  module: string;
  severity: string;
  occurrences: number;
  impactedSalons: number;
  firstOccurrence: string;
  lastOccurrence: string;
  status: string;
  recommendedAction: string;
  automation: string;
};

export type AdminModuleTelemetry = {
  module: string;
  successRate: string;
  failureRate: string;
  avgResponseMs: string;
  lastFailure: string;
  topError: string;
  trend: string;
};

export type AdminSalonOperationalRank = {
  salao: string;
  plano: string;
  status: string;
  score: string;
  detail: string;
  signal: string;
};

export type AdminOperationalSuggestion = {
  title: string;
  detail: string;
  kind: "automatico" | "sugerido" | "manual";
  target: string;
};

export type AdminHealthCheckSummary = {
  name: string;
  status: string;
  score: string;
  updatedAt: string;
};

export type AdminMasterOperationalSnapshot = {
  health: AdminHealthOverview;
  incidents: AdminIncidentSummary[];
  moduleTelemetry: AdminModuleTelemetry[];
  salonsAtRisk: AdminSalonOperationalRank[];
  engagedSalons: AdminSalonOperationalRank[];
  suggestions: AdminOperationalSuggestion[];
  healthChecks: AdminHealthCheckSummary[];
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

function safeNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeModule(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "sistema";
  if (["comanda", "comandas"].includes(normalized)) return "comanda";
  if (["agenda", "agendamentos"].includes(normalized)) return "agenda";
  if (["caixa"].includes(normalized)) return "caixa";
  if (["vendas", "venda"].includes(normalized)) return "vendas";
  if (["auth", "login", "shell"].includes(normalized)) return "auth";
  if (["asaas", "webhooks", "webhook"].includes(normalized)) return "webhooks";
  if (["assinatura", "assinaturas"].includes(normalized)) return "assinatura";
  return normalized;
}

function formatModuleLabel(value: string) {
  if (value === "agenda") return "Agenda";
  if (value === "caixa") return "Caixa";
  if (value === "comanda") return "Comanda";
  if (value === "vendas") return "Vendas";
  if (value === "assinatura") return "Assinaturas";
  if (value === "auth") return "Login/Auth";
  if (value === "webhooks") return "Webhooks";
  if (value === "admin_master") return "Admin Master";
  if (value === "app_profissional") return "App Profissional";
  return value
    .split("_")
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" ");
}

function isOpaqueServerComponentMessage(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.includes("an error occurred in the server components render") &&
    normalized.includes("digest property")
  );
}

function humanizeOperationalMessage(params: {
  message?: string | null;
  route?: string | null;
  action?: string | null;
  module?: string | null;
}) {
  const message = String(params.message || "").trim();

  if (!message) return "Sem detalhe adicional.";

  if (isOpaqueServerComponentMessage(message)) {
    const location = params.route || params.module || "rota_desconhecida";
    const action = params.action || "render";
    return `Falha opaca de render em ${location}. Acao monitorada: ${action}.`;
  }

  if (/unauthorized|sessao invalida|nao autenticado|não autenticado/i.test(message)) {
    return "Sessao expirada ou acesso invalido durante a operacao.";
  }

  if (/timeout|timed out/i.test(message)) {
    return "Tempo limite excedido durante a operacao monitorada.";
  }

  if (/network|fetch failed|failed to fetch/i.test(message)) {
    return "Falha de comunicacao com servico interno ou integracao externa.";
  }

  return message.length > 96 ? `${message.slice(0, 96)}...` : message;
}

function mapIncidentSeverity(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "critica") return 4;
  if (normalized === "alta") return 3;
  if (normalized === "media") return 2;
  return 1;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function toPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function toResponseMs(value: number) {
  return value > 0 ? `${Math.round(value)} ms` : "-";
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((acc, item) => acc + item, 0) / values.length;
}

function inferHealthStatus(score: number): AdminHealthOverview["status"] {
  if (score >= 95) return "green";
  if (score >= 80) return "yellow";
  if (score >= 60) return "orange";
  return "red";
}

function inferHealthLabel(status: AdminHealthOverview["status"]) {
  if (status === "green") return "Estavel";
  if (status === "yellow") return "Atencao";
  if (status === "orange") return "Degradado";
  return "Critico";
}

export async function getAdminMasterOperationalSnapshot(): Promise<AdminMasterOperationalSnapshot> {
  return runAdminOperation({
    action: "admin_master_operational_snapshot",
    run: async (supabase) => {
  const now = Date.now();
  const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const last12h = new Date(now - 12 * 60 * 60 * 1000).toISOString();

  const [
    { data: eventsData },
    { data: incidentsData },
    { data: healthChecksData },
    { data: saloesData },
    { data: saudeData },
    { data: onboardingData },
    { data: trialRulesData },
    { data: trialExtensionsData },
    { data: trialAssinaturasData },
    { data: automaticActionsData },
  ] = await Promise.all([
    supabase
      .from("eventos_sistema")
      .select(
        "id, id_salao, modulo, tipo_evento, severidade, mensagem, rota, acao, response_ms, sucesso, created_at"
      )
      .gte("created_at", last24h)
      .order("created_at", { ascending: false })
      .limit(4000),
    supabase
      .from("incidentes_sistema")
      .select(
        "id, titulo, modulo, severidade, status, impacto_saloes, total_ocorrencias, primeira_ocorrencia_em, ultima_ocorrencia_em, acao_sugerida, resolucao_automatica_disponivel"
      )
      .neq("status", "resolvido")
      .order("ultima_ocorrencia_em", { ascending: false })
      .limit(20),
    supabase
      .from("health_checks_sistema")
      .select("chave, nome, status, score, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(12),
    supabase.from("saloes").select("id, nome, plano, status").limit(1000),
    supabase
      .from("score_saude_salao")
      .select(
        "id_salao, score_total, uso_recente, inadimplencia_risco, tickets_abertos, risco_cancelamento, atualizado_em"
      )
      .order("score_total", { ascending: true })
      .limit(30),
    supabase
      .from("score_onboarding_salao")
      .select("id_salao, score_total, dias_com_acesso, modulos_usados, atualizado_em")
      .order("score_total", { ascending: false })
      .limit(30),
    supabase
      .from("trial_extensoes_regras")
      .select("nome, score_minimo, dias_extra, ativo")
      .eq("ativo", true)
      .order("score_minimo", { ascending: false }),
    supabase
      .from("trial_extensoes_automaticas")
      .select("id_salao, trial_novo_fim, score_atingido, criado_em")
      .order("criado_em", { ascending: false })
      .limit(20),
    supabase
      .from("assinaturas")
      .select("id_salao, status, trial_fim_em")
      .in("status", ["teste_gratis", "trial"])
      .limit(300),
    supabase
      .from("acoes_automaticas_sistema")
      .select("tipo, referencia, executada, sucesso, log, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const events = (eventsData || []) as MonitoringEventRow[];
  const incidents = (incidentsData || []) as IncidentRow[];
  const healthChecks = (healthChecksData || []) as HealthCheckRow[];
  const saloes = (saloesData || []) as SalaoBaseRow[];
  const saloesSaude = (saudeData || []) as SalaoScoreSaudeRow[];
  const saloesOnboarding = (onboardingData || []) as SalaoScoreOnboardingRow[];
  const trialRules = (trialRulesData || []) as TrialRuleRow[];
  const trialExtensions = (trialExtensionsData || []) as TrialExtensionRow[];
  const trialAssinaturas = (trialAssinaturasData || []) as AssinaturaTrialRow[];
  const automaticActions = (automaticActionsData || []) as AutomaticActionRow[];

  const salaoById = new Map(
    saloes.map((item) => [
      item.id,
      {
        nome: item.nome || item.id,
        plano: item.plano || "-",
        status: item.status || "-",
      },
    ])
  );

  const failingEvents = events.filter((event) => {
    const severity = String(event.severidade || "").toLowerCase();
    return event.sucesso === false || severity === "error" || severity === "critical";
  });
  const impactedSalonsSet = new Set(
    [...failingEvents, ...events.filter((event) => String(event.tipo_evento || "") === "page_render_error")]
      .map((event) => event.id_salao)
      .filter(Boolean)
  );
  incidents.forEach((incident) => {
    if (safeNumber(incident.impacto_saloes) > 0) {
      impactedSalonsSet.add(`impact:${incident.id || ""}`);
    }
  });

  const slowRoutes = events.filter((event) => safeNumber(event.response_ms) >= 3000).length;
  const criticalActions = new Set([
    "salvar_item",
    "criar_cobranca",
    "finalizar_comanda",
    "adicionar_pagamento",
    "reabrir",
    "excluir",
    "mover_agendamento",
    "redimensionar_agendamento",
  ]);
  const failingCriticalActions = failingEvents.filter((event) =>
    criticalActions.has(String(event.acao || "").trim())
  ).length;
  const criticalIncidents = incidents.filter(
    (incident) => mapIncidentSeverity(incident.severidade) >= 3
  ).length;
  const errorRate24h = percentage(failingEvents.length, events.length || 1);

  let healthScore = 100;
  healthScore -= Math.min(30, criticalIncidents * 10);
  healthScore -= Math.min(25, errorRate24h * 0.9);
  healthScore -= Math.min(15, slowRoutes * 1.5);
  healthScore -= Math.min(15, impactedSalonsSet.size * 2);
  healthScore -= Math.min(15, failingCriticalActions * 3);
  healthScore = Math.max(0, Math.round(healthScore));

  const healthStatus = inferHealthStatus(healthScore);
  const healthLabel = inferHealthLabel(healthStatus);
  const healthSummary =
    incidents.length > 0
      ? `${incidents.length} incidente(s) aberto(s), ${failingEvents.length} falha(s) nas ultimas 24h e ${impactedSalonsSet.size} salao(oes) com impacto operacional.`
      : `${failingEvents.length} falha(s) nas ultimas 24h e ${slowRoutes} rota(s) lentas em observacao.`;

  const moduleMap = new Map<
    string,
    {
      total: number;
      failed: number;
      responseMs: number[];
      lastFailure: string | null;
      errors: Map<string, number>;
      last12hFailures: number;
      previous12hFailures: number;
    }
  >();

  for (const event of events) {
    const moduleKey = normalizeModule(event.modulo);
    const current = moduleMap.get(moduleKey) || {
      total: 0,
      failed: 0,
      responseMs: [],
      lastFailure: null,
      errors: new Map<string, number>(),
      last12hFailures: 0,
      previous12hFailures: 0,
    };
    const failed =
      event.sucesso === false ||
      ["error", "critical"].includes(String(event.severidade || "").toLowerCase());

    current.total += 1;

    if (safeNumber(event.response_ms) > 0) {
      current.responseMs.push(safeNumber(event.response_ms));
    }

    if (failed) {
      current.failed += 1;
      current.errors.set(
        String(event.mensagem || "Erro operacional"),
        (current.errors.get(String(event.mensagem || "Erro operacional")) || 0) + 1
      );
      current.lastFailure =
        current.lastFailure && current.lastFailure > String(event.created_at || "")
          ? current.lastFailure
          : String(event.created_at || "");

      if (String(event.created_at || "") >= last12h) {
        current.last12hFailures += 1;
      } else {
        current.previous12hFailures += 1;
      }
    }

    moduleMap.set(moduleKey, current);
  }

  const moduleTelemetry = Array.from(moduleMap.entries())
    .map(([moduleKey, current]) => {
      const topError =
        [...current.errors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
      const trend =
        current.last12hFailures > current.previous12hFailures
          ? "Piorando"
          : current.last12hFailures < current.previous12hFailures
            ? "Melhorando"
            : "Estavel";

      return {
        module: formatModuleLabel(moduleKey),
        successRate: toPercent(percentage(current.total - current.failed, current.total)),
        failureRate: toPercent(percentage(current.failed, current.total)),
        avgResponseMs: toResponseMs(average(current.responseMs)),
        lastFailure: dateTimeValue(current.lastFailure),
        topError: humanizeOperationalMessage({
          message: topError,
          module: moduleKey,
        }),
        trend,
        failureCount: current.failed,
      };
    })
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 8)
    .map(({ failureCount: _failureCount, ...item }) => item);

  const incidentsSummary = incidents
    .map((incident) => ({
      id: String(incident.id || ""),
      title: String(incident.titulo || "Incidente operacional"),
      module: formatModuleLabel(normalizeModule(incident.modulo)),
      severity: String(incident.severidade || "media"),
      occurrences: safeNumber(incident.total_ocorrencias),
      impactedSalons: safeNumber(incident.impacto_saloes),
      firstOccurrence: dateTimeValue(incident.primeira_ocorrencia_em),
      lastOccurrence: dateTimeValue(incident.ultima_ocorrencia_em),
      status: String(incident.status || "aberto"),
      recommendedAction: String(
        incident.acao_sugerida || "Investigar causa raiz e acompanhar recorrencia."
      ),
      automation: incident.resolucao_automatica_disponivel ? "Disponivel" : "Manual",
      severityOrder: mapIncidentSeverity(incident.severidade),
    }))
    .sort((a, b) => b.severityOrder - a.severityOrder)
    .slice(0, 6)
    .map(({ severityOrder: _severityOrder, ...item }) => item);

  const failuresBySalao = new Map<string, number>();
  for (const event of failingEvents) {
    const key = String(event.id_salao || "").trim();
    if (!key) continue;
    failuresBySalao.set(key, (failuresBySalao.get(key) || 0) + 1);
  }

  const salonsAtRisk = saloesSaude
    .map((item) => {
      const salao = salaoById.get(String(item.id_salao || ""));
      const falhas24h = failuresBySalao.get(String(item.id_salao || "")) || 0;
      return {
        salao: salao?.nome || String(item.id_salao || "-"),
        plano: salao?.plano || "-",
        status: salao?.status || "-",
        score: String(safeNumber(item.score_total)),
        detail: `Uso ${safeNumber(item.uso_recente)} | Tickets ${safeNumber(
          item.tickets_abertos
        )} | Inadimplencia ${safeNumber(item.inadimplencia_risco)}`,
        signal: `${safeNumber(item.risco_cancelamento)} risco de cancelamento e ${falhas24h} falhas nas ultimas 24h`,
        riskScore:
          (100 - safeNumber(item.score_total)) +
          safeNumber(item.risco_cancelamento) +
          safeNumber(item.tickets_abertos) * 6 +
          falhas24h * 8,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map(({ riskScore: _riskScore, ...item }) => item);

  const engagedSalons = saloesOnboarding
    .map((item) => {
      const salao = salaoById.get(String(item.id_salao || ""));
      return {
        salao: salao?.nome || String(item.id_salao || "-"),
        plano: salao?.plano || "-",
        status: salao?.status || "-",
        score: String(safeNumber(item.score_total)),
        detail: `${safeNumber(item.dias_com_acesso)} dias com acesso e ${safeNumber(
          item.modulos_usados
        )} modulos usados`,
        signal: `Atualizado em ${dateTimeValue(item.atualizado_em)}`,
        engagementScore:
          safeNumber(item.score_total) +
          safeNumber(item.dias_com_acesso) * 4 +
          safeNumber(item.modulos_usados) * 6,
      };
    })
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 5)
    .map(({ engagementScore: _engagementScore, ...item }) => item);

  const activeTrialRule = [...trialRules].sort(
    (a, b) => safeNumber(b.score_minimo) - safeNumber(a.score_minimo)
  )[0];
  const extendedSalonsSet = new Set(
    trialExtensions.map((item) => String(item.id_salao || "")).filter(Boolean)
  );
  const onboardingBySalao = new Map(
    saloesOnboarding.map((item) => [
      String(item.id_salao || ""),
      {
        score: safeNumber(item.score_total),
        dias: safeNumber(item.dias_com_acesso),
        modulos: safeNumber(item.modulos_usados),
      },
    ])
  );

  const eligibleTrialExtensions = trialAssinaturas.filter((item) => {
    const idSalao = String(item.id_salao || "");
    const onboarding = onboardingBySalao.get(idSalao);
    const trialFim = item.trial_fim_em ? new Date(item.trial_fim_em) : null;

    return Boolean(
      idSalao &&
        onboarding &&
        activeTrialRule &&
        !extendedSalonsSet.has(idSalao) &&
        onboarding.score >= safeNumber(activeTrialRule.score_minimo) &&
        trialFim &&
        !Number.isNaN(trialFim.getTime()) &&
        trialFim.getTime() >= now
    );
  });

  const latestAutomaticAction = automaticActions[0];
  const suggestions: AdminOperationalSuggestion[] = [
    {
      title: "Executar correcoes seguras",
      detail:
        criticalIncidents > 0
          ? `${criticalIncidents} incidente(s) de alta criticidade pedem resposta imediata em alertas, tickets internos ou webhooks.`
          : "Nenhum incidente critico aberto agora, mas o fluxo de correcao segura esta pronto para agir rapido.",
      kind: criticalIncidents > 0 ? "sugerido" : "automatico",
      target: criticalIncidents > 0 ? `${criticalIncidents} incidentes` : "fila operacional",
    },
    {
      title: "Conceder +7 dias para trials engajados",
      detail:
        eligibleTrialExtensions.length > 0
          ? `${eligibleTrialExtensions.length} salao(oes) em trial atingiram a regra de engajamento e podem receber extensao com seguranca.`
          : "Nenhum salao elegivel agora para extensao automatica de trial.",
      kind: eligibleTrialExtensions.length > 0 ? "automatico" : "manual",
      target:
        eligibleTrialExtensions.length > 0
          ? `${eligibleTrialExtensions.length} candidatos`
          : "sem candidatos",
    },
    {
      title: "Acompanhar ultima automacao",
      detail:
        latestAutomaticAction?.log ||
        "Nenhuma automacao registrada ainda. O sistema segue sem evento automatico recente.",
      kind: latestAutomaticAction?.sucesso ? "automatico" : "sugerido",
      target:
        latestAutomaticAction?.referencia ||
        dateTimeValue(latestAutomaticAction?.created_at || null),
    },
  ];

  const healthChecksSummary = healthChecks.map((item) => ({
    name: String(item.nome || item.chave || "Health check"),
    status: String(item.status || "ok"),
    score: String(safeNumber(item.score)),
    updatedAt: dateTimeValue(item.atualizado_em),
  }));

  return {
    health: {
      score: healthScore,
      status: healthStatus,
      label: healthLabel,
      summary: healthSummary,
      errorRate24h,
      openIncidents: incidents.length,
      impactedSalons: impactedSalonsSet.size,
      slowRoutes,
      failingCriticalActions,
    },
    incidents: incidentsSummary,
    moduleTelemetry,
    salonsAtRisk,
    engagedSalons,
    suggestions,
    healthChecks: healthChecksSummary,
  };
    },
  });
}
