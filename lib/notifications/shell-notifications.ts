import type { ShellNotification } from "@/components/layout/NotificationBell";
import type { getResumoAssinatura } from "@/lib/assinatura-utils";

export type ClienteNascimento = {
  id: string;
  nome?: string | null;
  data_nascimento?: string | null;
};

export type AgendamentoNotificacao = {
  id: string;
  status?: string | null;
  data?: string | null;
  hora_inicio?: string | null;
};

export type CaixaMovimentoNotificacao = {
  id: string;
  tipo?: string | null;
  valor?: number | null;
  created_at?: string | null;
};

export type TicketNotificacao = {
  id: string;
  numero?: number | string | null;
  assunto?: string | null;
  prioridade?: string | null;
  status?: string | null;
  ultima_interacao_em?: string | null;
};

export type EstoqueAlertaNotificacao = {
  id: string;
  tipo?: string | null;
  mensagem?: string | null;
};

export type SistemaAlertaNotificacao = {
  id: string;
  tipo?: string | null;
  gravidade?: string | null;
  origem_modulo?: string | null;
  titulo?: string | null;
  descricao?: string | null;
};

export type OnboardingScoreNotificacao = {
  score_total?: number | null;
  dias_com_acesso?: number | null;
  modulos_usados?: number | null;
  detalhes_json?: Record<string, unknown> | null;
};

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
      href: "/assinatura",
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
      href: "/assinatura",
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
      href: "/marketing",
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
      href: "/agenda",
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
      href: "/agenda",
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
      href: "/caixa",
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
      href: "/caixa",
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
      href: "/estoque",
      critical: true,
    });
  }

  const webhookAlerts = alertasSistema.filter(isWebhookAlert);

  if (webhookAlerts.length > 0) {
    const criticalWebhookAlerts = webhookAlerts.filter(isCriticalAlert);
    const primaryAlert = webhookAlerts[0];

    notifications.push({
      id: "webhook-falho",
      title: `${webhookAlerts.length} webhook(s) em atencao`,
      description:
        String(primaryAlert?.descricao || primaryAlert?.titulo || "").trim() ||
        "Eventos de cobranca precisam de acompanhamento para manter a assinatura segura.",
      tone: criticalWebhookAlerts.length > 0 ? "danger" : "warning",
      category: "webhook",
      href: "/assinatura",
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
      href: "/suporte",
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
      href: "/dashboard?tour=1",
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
      href: "/suporte",
    });
  }

  return notifications;
}
