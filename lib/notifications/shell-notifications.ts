import type { getResumoAssinatura } from "@/lib/assinatura-utils";
import type {
  AgendamentoNotificacao,
  CaixaMovimentoNotificacao,
  ClienteNascimento,
  EstoqueAlertaNotificacao,
  OnboardingScoreNotificacao,
  ShellNotification,
  ShellNotificationSeverity,
  SistemaAlertaNotificacao,
  TicketNotificacao,
} from "@/lib/notifications/contracts";

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isBirthdayThisMonth(value?: string | null) {
  if (!value) return false;

  const parts = value.split(/[-/]/);
  const month =
    parts.length >= 2
      ? Number(parts[1])
      : Number(new Date(value).getMonth() + 1 || 0);

  return month === new Date().getMonth() + 1;
}

function normalizeAlertSeverity(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function mapShellSeverity(value?: string | null): ShellNotificationSeverity {
  const normalized = normalizeAlertSeverity(value);

  if (["critica", "critical"].includes(normalized)) return "critical";
  if (["alta", "high", "error"].includes(normalized)) return "high";
  if (["media", "medium", "warning"].includes(normalized)) return "medium";
  return "low";
}

function isCriticalAlert(alerta: SistemaAlertaNotificacao) {
  return ["alta", "critica", "critical", "high"].includes(
    normalizeAlertSeverity(alerta.gravidade)
  );
}

function isWebhookAlert(alerta: SistemaAlertaNotificacao) {
  const haystack = `${String(alerta.tipo || "")} ${String(alerta.origem_modulo || "")}`.toLowerCase();
  return haystack.includes("webhook") || haystack.includes("asaas");
}

function getOnboardingNextSteps(onboarding?: OnboardingScoreNotificacao | null) {
  const detalhes =
    onboarding?.detalhes_json && typeof onboarding.detalhes_json === "object"
      ? onboarding.detalhes_json
      : {};

  const suggestions: string[] = [];
  const profissionais = Number(detalhes.profissionais || 0);
  const servicos = Number(detalhes.servicos || 0);
  const clientes = Number(detalhes.clientes || 0);
  const agendamentos = Number(detalhes.agendamentos || 0);
  const caixas = Number(detalhes.caixas || 0);

  if (profissionais < 2) suggestions.push("cadastre a equipe");
  if (servicos < 5) suggestions.push("organize os servicos");
  if (clientes < 5) suggestions.push("importe os clientes");
  if (agendamentos < 3) suggestions.push("crie os primeiros agendamentos");
  if (caixas < 1) suggestions.push("abra o primeiro caixa");

  return suggestions.slice(0, 2);
}

export function buildShellNotifications({
  resumoAssinatura,
  clientes,
  agendamentos,
  movimentosCaixa,
  tickets,
  estoqueAlertas = [],
  alertasSistema = [],
  onboarding = null,
}: {
  resumoAssinatura: ReturnType<typeof getResumoAssinatura> | null;
  clientes: ClienteNascimento[];
  agendamentos: AgendamentoNotificacao[];
  movimentosCaixa: CaixaMovimentoNotificacao[];
  tickets: TicketNotificacao[];
  estoqueAlertas?: EstoqueAlertaNotificacao[];
  alertasSistema?: SistemaAlertaNotificacao[];
  onboarding?: OnboardingScoreNotificacao | null;
}): ShellNotification[] {
  const notifications: ShellNotification[] = [];

  if (resumoAssinatura?.bloqueioTotal) {
    notifications.push({
      id: "assinatura-bloqueada",
      title: "Assinatura bloqueada",
      description: "Regularize o plano para liberar o sistema sem interrupcao.",
      tone: "danger",
      category: "assinatura",
      severity: "critical",
      eventType: "subscription_blocked",
      href: "/assinatura",
      actionLabel: "Regularizar plano",
      destination: "internal",
      icon: "assinatura",
      sourceModule: "assinatura",
      persistUntilResolved: true,
      expiresAt: null,
      critical: true,
    });
  } else if (resumoAssinatura?.vencendoLogo) {
    notifications.push({
      id: "assinatura-vencendo",
      title: "Assinatura perto do vencimento",
      description:
        resumoAssinatura.diasRestantes != null
          ? `Vence em ${resumoAssinatura.diasRestantes} dia(s).`
          : "Confira o plano para manter a renovacao em dia.",
      tone: "warning",
      category: "assinatura",
      severity: "high",
      eventType: "subscription_due_soon",
      href: "/assinatura",
      actionLabel: "Ver assinatura",
      destination: "internal",
      icon: "assinatura",
      sourceModule: "assinatura",
      persistUntilResolved: true,
      expiresAt: resumoAssinatura.vencimentoEm
        ? new Date(resumoAssinatura.vencimentoEm).toISOString()
        : null,
    });
  }

  const aniversariantes = clientes.filter((cliente) =>
    isBirthdayThisMonth(cliente.data_nascimento)
  );

  if (aniversariantes.length > 0) {
    notifications.push({
      id: "aniversariantes-mes",
      title: `${aniversariantes.length} aniversariante(s) no mes`,
      description: "Boa chance de disparar campanha de retorno pelo Marketing.",
      tone: "info",
      category: "aniversario",
      severity: "low",
      eventType: "customers_birthday_month",
      href: "/marketing",
      actionLabel: "Abrir marketing",
      destination: "internal",
      icon: "marketing",
      sourceModule: "clientes",
      sourceEntity: "clientes",
    });
  }

  const finalizados = agendamentos.filter((agendamento) =>
    ["finalizado", "finalizada", "concluido", "concluida"].includes(
      String(agendamento.status || "").toLowerCase()
    )
  );

  if (finalizados.length > 0) {
    notifications.push({
      id: "agendamentos-finalizados",
      title: `${finalizados.length} agendamento(s) finalizado(s) hoje`,
      description: "Confira comandas e recebimentos para nao deixar venda solta.",
      tone: "success",
      category: "agenda",
      severity: "medium",
      eventType: "appointments_completed_today",
      href: "/agenda",
      actionLabel: "Abrir agenda",
      destination: "internal",
      icon: "agenda",
      sourceModule: "agenda",
      sourceEntity: "agendamentos",
    });
  }

  const agendados = agendamentos.filter((agendamento) =>
    ["agendado", "confirmado", "pendente"].includes(
      String(agendamento.status || "").toLowerCase()
    )
  );

  if (agendados.length > 0) {
    notifications.push({
      id: "clientes-agendados",
      title: `${agendados.length} cliente(s) na agenda de hoje`,
      description: "Acompanhe encaixes, atrasos e conversao em comanda.",
      tone: "neutral",
      category: "agenda",
      severity: "low",
      eventType: "appointments_today_pending",
      href: "/agenda",
      actionLabel: "Ver agenda",
      destination: "internal",
      icon: "agenda",
      sourceModule: "agenda",
      sourceEntity: "agendamentos",
    });
  }

  const sangrias = movimentosCaixa.filter(
    (movimento) => movimento.tipo === "sangria"
  );

  if (sangrias.length > 0) {
    notifications.push({
      id: "sangrias-hoje",
      title: `${sangrias.length} sangria(s) hoje`,
      description: "Confira os movimentos antes de fechar o caixa.",
      tone: "warning",
      category: "caixa",
      severity: "medium",
      eventType: "cash_withdrawals_today",
      href: "/caixa",
      actionLabel: "Ver caixa",
      destination: "internal",
      icon: "caixa",
      sourceModule: "caixa",
      sourceEntity: "caixa_movimentacoes",
    });
  }

  const vales = movimentosCaixa.filter(
    (movimento) => movimento.tipo === "vale_profissional"
  );

  if (vales.length > 0) {
    notifications.push({
      id: "vales-profissionais-hoje",
      title: `${vales.length} vale(s) profissional hoje`,
      description: "Os vales ficam preparados para desconto no repasse.",
      tone: "warning",
      category: "caixa",
      severity: "medium",
      eventType: "professional_advances_today",
      href: "/caixa",
      actionLabel: "Revisar vales",
      destination: "internal",
      icon: "caixa",
      sourceModule: "caixa",
      sourceEntity: "caixa_movimentacoes",
    });
  }

  if (estoqueAlertas.length > 0) {
    const preview = estoqueAlertas
      .map((alerta) => String(alerta.mensagem || "").trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" • ");

    notifications.push({
      id: "estoque-critico",
      title: `${estoqueAlertas.length} alerta(s) de estoque`,
      description:
        preview ||
        "Existem produtos em risco. Revise entradas, saidas e consumo dos servicos.",
      tone: estoqueAlertas.length > 2 ? "danger" : "warning",
      category: "estoque",
      severity: estoqueAlertas.length > 2 ? "high" : "medium",
      eventType: "stock_alerts_open",
      href: "/estoque",
      actionLabel: "Ver estoque",
      destination: "internal",
      icon: "estoque",
      sourceModule: "estoque",
      sourceEntity: "produtos_alertas",
      persistUntilResolved: true,
      expiresAt: null,
      critical: true,
    });
  }

  const webhookAlerts = alertasSistema.filter(isWebhookAlert);

  if (webhookAlerts.length > 0) {
    const criticalWebhookAlerts = webhookAlerts.filter(isCriticalAlert);
    const primaryAlert = webhookAlerts[0];
    const webhookSeverity = criticalWebhookAlerts.length > 0
      ? "critical"
      : mapShellSeverity(primaryAlert?.gravidade);

    notifications.push({
      id: "webhook-falho",
      title: `${webhookAlerts.length} webhook(s) em atencao`,
      description:
        String(primaryAlert?.descricao || primaryAlert?.titulo || "").trim() ||
        "Eventos de cobranca precisam de acompanhamento para manter a assinatura segura.",
      tone: criticalWebhookAlerts.length > 0 ? "danger" : "warning",
      category: "webhook",
      severity: webhookSeverity,
      eventType: "webhook_alert_open",
      href: "/assinatura",
      actionLabel: "Ver cobrancas",
      destination: "internal",
      icon: "webhook",
      sourceModule: "webhooks",
      sourceEntity: "alertas_sistema",
      sourceEntityId: primaryAlert?.id,
      persistUntilResolved: true,
      expiresAt: null,
      critical: true,
    });
  }

  const criticalSystemAlerts = alertasSistema.filter(
    (alerta) => !isWebhookAlert(alerta) && isCriticalAlert(alerta)
  );

  if (criticalSystemAlerts.length > 0) {
    const latest = criticalSystemAlerts[0];

    notifications.push({
      id: "operacao-critica",
      title: `${criticalSystemAlerts.length} alerta(s) critico(s) do sistema`,
      description:
        String(latest?.titulo || latest?.descricao || "").trim() ||
        "O sistema identificou uma situacao que pede revisao imediata.",
      tone: "danger",
      category: "sistema",
      severity: mapShellSeverity(latest?.gravidade),
      eventType: "system_alert_open",
      href: "/suporte",
      actionLabel: "Abrir suporte",
      destination: "help",
      icon: "alert",
      sourceModule: String(latest?.origem_modulo || "sistema"),
      sourceEntity: "alertas_sistema",
      sourceEntityId: latest?.id,
      persistUntilResolved: true,
      expiresAt: latest?.updated_at || latest?.criado_em || null,
      critical: true,
    });
  }

  const scoreOnboarding = Number(onboarding?.score_total || 0);
  const onboardingHints = getOnboardingNextSteps(onboarding);
  const shouldShowOnboarding =
    onboarding != null &&
    (scoreOnboarding < 70 || Number(onboarding.modulos_usados || 0) < 4);

  if (shouldShowOnboarding) {
    notifications.push({
      id: "tour-guiado",
      title: `Tour guiado disponivel (${scoreOnboarding}/100)`,
      description:
        onboardingHints.length > 0
          ? `Proximos passos: ${onboardingHints.join(" e ")}.`
          : "Use o tour para entender dashboard, agenda, clientes, servicos, caixa e assinatura.",
      tone: "info",
      category: "onboarding",
      severity: "low",
      eventType: "guided_onboarding_available",
      href: "/dashboard?tour=1",
      actionLabel: "Abrir tour",
      destination: "internal",
      icon: "onboarding",
      sourceModule: "onboarding",
      sourceEntity: "score_onboarding_salao",
    });
  }

  const ticketsAbertos = tickets.filter((ticket) =>
    ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_tecnico"].includes(
      String(ticket.status || "").toLowerCase()
    )
  );

  if (ticketsAbertos.length > 0) {
    const urgentes = ticketsAbertos.filter((ticket) =>
      ["alta", "critica"].includes(String(ticket.prioridade || "").toLowerCase())
    ).length;

    notifications.push({
      id: "tickets-suporte",
      title: `${ticketsAbertos.length} ticket(s) em andamento`,
      description:
        urgentes > 0
          ? `${urgentes} ticket(s) com prioridade alta ou critica aguardando retorno.`
          : "Acompanhe respostas e atualizacoes do suporte.",
      tone: urgentes > 0 ? "warning" : "info",
      category: "suporte",
      severity: urgentes > 0 ? "high" : "medium",
      eventType: "support_tickets_open",
      href: "/suporte",
      actionLabel: "Abrir suporte",
      destination: "help",
      icon: "suporte",
      sourceModule: "suporte",
      sourceEntity: "tickets",
      persistUntilResolved: urgentes > 0,
      expiresAt: null,
    });
  }

  return notifications;
}
