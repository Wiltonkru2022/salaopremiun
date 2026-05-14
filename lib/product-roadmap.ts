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
    label: "Em implementação",
    description: "Já está na esteira técnica ou entrando em produção controlada.",
  },
  planejado: {
    label: "Planejado",
    description: "Desenhado para entrar depois das entregas mais críticas.",
  },
  entregue: {
    label: "Disponível",
    description: "Base pronta no produto e pronta para evoluir com uso real.",
  },
};

export const productRoadmap: RoadmapItem[] = [
  {
    title: "NFS-e",
    description:
      "Emissão fiscal integrada ao fluxo financeiro, com cuidado para prefeitura, rastreio e operação diária.",
    category: "Financeiro",
    status: "em_implementacao",
    eta: "Em implementação",
    impact: "Menos trabalho manual depois do atendimento.",
  },
  {
    title: "WhatsApp automático",
    description:
      "Lembretes, confirmações e mensagens de relacionamento com disparo profissional e controle no painel.",
    category: "Comunicação",
    status: "em_implementacao",
    eta: "Em implementação",
    impact: "Cliente mais avisado, agenda mais protegida.",
  },
  {
    title: "Cobrança de sinal",
    description:
      "Entrada configurável por serviço para reduzir faltas, proteger horários longos e organizar confirmações.",
    category: "Agenda",
    status: "em_implementacao",
    eta: "Próxima etapa",
    impact: "Mais segurança para horários disputados.",
  },
  {
    title: "Google Calendar",
    description:
      "Sincronização dos horários confirmados com a agenda externa do profissional.",
    category: "Agenda",
    status: "entregue",
    eta: "Disponível",
    impact: "Menos conflito entre agenda pessoal e agenda do salão.",
  },
  {
    title: "Agendamento em grupo",
    description:
      "Controle de capacidade por horário para aulas, pacotes, turmas e atendimentos coletivos.",
    category: "Agenda",
    status: "planejado",
    eta: "Planejado",
    impact: "Um horário, várias vagas, sem bagunça operacional.",
  },
  {
    title: "Recorrência",
    description:
      "Criação de repetições semanais ou mensais para clientes fixos, pacotes e planos recorrentes.",
    category: "Agenda",
    status: "planejado",
    eta: "Planejado",
    impact: "Clientes frequentes entram na agenda com menos clique.",
  },
  {
    title: "Linha do tempo do cliente",
    description:
      "Histórico unificado com agendamentos, observações, pagamentos, avaliações e contatos.",
    category: "Clientes",
    status: "planejado",
    eta: "Planejado",
    impact: "Atendimento mais pessoal e equipe mais informada.",
  },
  {
    title: "Link público direto",
    description:
      "Link curto e divulgável para abrir o perfil público do salão no app cliente.",
    category: "App cliente",
    status: "entregue",
    eta: "Disponível",
    impact: "Mais fácil colocar na bio, campanha e WhatsApp.",
  },
  {
    title: "Bloqueios da agenda",
    description:
      "Base para pausas, férias, feriados, dia inteiro e futuras repetições de indisponibilidade.",
    category: "Agenda",
    status: "entregue",
    eta: "Base pronta",
    impact: "Agenda mais fiel ao que o salão realmente atende.",
  },
];

export function getRoadmapByStatus(status: RoadmapStatus) {
  return productRoadmap.filter((item) => item.status === status);
}
