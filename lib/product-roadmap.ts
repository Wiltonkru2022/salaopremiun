export type RoadmapStatus = "em_implementacao" | "planejado" | "entregue";

export type RoadmapItem = {
  title: string;
  description: string;
  category: string;
  status: RoadmapStatus;
  eta: string;
  impact: string;
};

export const roadmapStatusCopy: Record<
  RoadmapStatus,
  { label: string; description: string }
> = {
  em_implementacao: {
    label: "Em implementacao",
    description: "Ja esta na esteira tecnica ou entrando em producao controlada.",
  },
  planejado: {
    label: "Planejado",
    description: "Desenhado para entrar depois das entregas mais criticas.",
  },
  entregue: {
    label: "Disponivel",
    description: "Base pronta no produto e pronta para evoluir com uso real.",
  },
};

export const productRoadmap: RoadmapItem[] = [
  {
    title: "NFS-e",
    description:
      "Emissao fiscal integrada ao fluxo financeiro, com cuidado para prefeitura, rastreio e operacao diaria.",
    category: "Financeiro",
    status: "em_implementacao",
    eta: "Em implementacao",
    impact: "Menos trabalho manual depois do atendimento.",
  },
  {
    title: "WhatsApp automatico",
    description:
      "Lembretes, confirmacoes e mensagens de relacionamento com disparo profissional e controle no painel.",
    category: "Comunicacao",
    status: "em_implementacao",
    eta: "Em implementacao",
    impact: "Cliente mais avisado, agenda mais protegida.",
  },
  {
    title: "Cobranca de sinal",
    description:
      "Entrada configuravel por servico para reduzir faltas, proteger horarios longos e organizar confirmacoes.",
    category: "Agenda",
    status: "em_implementacao",
    eta: "Proxima etapa",
    impact: "Mais seguranca para horarios disputados.",
  },
  {
    title: "Google Calendar",
    description:
      "Sincronizacao dos horarios confirmados com a agenda externa do profissional.",
    category: "Agenda",
    status: "planejado",
    eta: "Planejado",
    impact: "Menos conflito entre agenda pessoal e agenda do salao.",
  },
  {
    title: "Agendamento em grupo",
    description:
      "Controle de capacidade por horario para aulas, pacotes, turmas e atendimentos coletivos.",
    category: "Agenda",
    status: "planejado",
    eta: "Planejado",
    impact: "Um horario, varias vagas, sem bagunca operacional.",
  },
  {
    title: "Recorrencia",
    description:
      "Criacao de repeticoes semanais ou mensais para clientes fixos, pacotes e planos recorrentes.",
    category: "Agenda",
    status: "planejado",
    eta: "Planejado",
    impact: "Clientes frequentes entram na agenda com menos clique.",
  },
  {
    title: "Linha do tempo do cliente",
    description:
      "Historico unificado com agendamentos, observacoes, pagamentos, avaliacoes e contatos.",
    category: "Clientes",
    status: "planejado",
    eta: "Planejado",
    impact: "Atendimento mais pessoal e equipe mais informada.",
  },
  {
    title: "Link publico direto",
    description:
      "Link curto e divulgavel para abrir o perfil publico do salao no app cliente.",
    category: "App cliente",
    status: "entregue",
    eta: "Disponivel",
    impact: "Mais facil colocar na bio, campanha e WhatsApp.",
  },
  {
    title: "Bloqueios da agenda",
    description:
      "Base para pausas, ferias, feriados, dia inteiro e futuras repeticoes de indisponibilidade.",
    category: "Agenda",
    status: "entregue",
    eta: "Base pronta",
    impact: "Agenda mais fiel ao que o salao realmente atende.",
  },
];

export function getRoadmapByStatus(status: RoadmapStatus) {
  return productRoadmap.filter((item) => item.status === status);
}
