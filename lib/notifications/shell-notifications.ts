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

export function buildShellNotifications({
  resumoAssinatura,
  clientes,
  agendamentos,
  movimentosCaixa,
  tickets,
}: {
  resumoAssinatura: ReturnType<typeof getResumoAssinatura> | null;
  clientes: ClienteNascimento[];
  agendamentos: AgendamentoNotificacao[];
  movimentosCaixa: CaixaMovimentoNotificacao[];
  tickets: TicketNotificacao[];
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
