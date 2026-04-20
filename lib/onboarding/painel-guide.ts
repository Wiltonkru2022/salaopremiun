export type PainelOnboardingSnapshot = {
  scoreTotal?: number | null;
  diasComAcesso?: number | null;
  modulosUsados?: number | null;
  detalhes?: Record<string, unknown> | null;
};

export type PainelOnboardingStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  highlight: string;
  checklist: string[];
  quickActions: string[];
};

const BASE_STEPS: PainelOnboardingStep[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "Comece pelo resumo do negocio: alertas, indicadores, agenda do dia e pendencias do caixa.",
    href: "/dashboard",
    highlight: "Veja primeiro o que pede resposta imediata.",
    checklist: [
      "Ler alertas criticos e riscos da assinatura.",
      "Conferir agenda do dia e pendencias operacionais.",
      "Usar o resumo como ponto de partida da equipe.",
    ],
    quickActions: ["Revisar alertas", "Priorizar o dia", "Checar gargalos"],
  },
  {
    id: "agenda",
    title: "Agenda",
    description:
      "Aqui voce controla encaixes, bloqueios, horarios e a trilha operacional do atendimento.",
    href: "/agenda",
    highlight: "Agenda forte reduz erro e acelera a recepcao.",
    checklist: [
      "Conferir conflitos e encaixes do dia.",
      "Garantir que bloqueios estejam claros.",
      "Resolver pendencias antes de abrir o caixa.",
    ],
    quickActions: ["Encaixar cliente", "Bloquear horario", "Revisar timeline"],
  },
  {
    id: "clientes",
    title: "Clientes",
    description:
      "Cadastre, acompanhe historico e prepare a base para marketing, recorrencia e suporte.",
    href: "/clientes",
    highlight: "Cliente bem cadastrado faz o resto do sistema render.",
    checklist: [
      "Salvar contato sem duplicar telefone ou e-mail.",
      "Deixar WhatsApp e bairro legiveis para retorno.",
      "Registrar observacoes que ajudem no proximo atendimento.",
    ],
    quickActions: ["Cadastrar cliente", "Filtrar recorrentes", "Abrir detalhe"],
  },
  {
    id: "servicos",
    title: "Servicos",
    description:
      "Defina preco, duracao, comissao e consumo para deixar a operacao previsivel.",
    href: "/servicos",
    highlight: "Servico bem configurado evita retrabalho em agenda, caixa e comissao.",
    checklist: [
      "Confirmar preco, custo e margem.",
      "Separar regra padrao de excecao por profissional.",
      "Garantir que consumo de produto esteja correto.",
    ],
    quickActions: ["Ajustar preco", "Revisar comissao", "Checar consumo"],
  },
  {
    id: "caixa",
    title: "Caixa",
    description:
      "Confira comandas, recebimentos, sangrias, vales e a sensacao real do dinheiro entrando.",
    href: "/caixa",
    highlight: "O caixa precisa parecer seguro e rapido todos os dias.",
    checklist: [
      "Abrir sessao antes de receber.",
      "Conferir diferenca entre total, pago e restante.",
      "Fechar com historico claro de movimentos.",
    ],
    quickActions: ["Abrir caixa", "Receber comanda", "Conferir movimentos"],
  },
];

const ASSINATURA_STEP: PainelOnboardingStep = {
  id: "assinatura",
  title: "Assinatura",
  description:
    "Acompanhe plano, cobrancas, trial e qualquer risco operacional ligado ao pagamento.",
  href: "/assinatura",
  highlight: "Assinatura organizada protege a continuidade do negocio.",
  checklist: [
    "Revisar status comercial atual.",
    "Conferir cobrancas pendentes e renovacao.",
    "Resolver bloqueio antes de travar a operacao.",
  ],
  quickActions: ["Ver cobrancas", "Checar renovacao", "Resolver bloqueio"],
};

function safeNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getPainelOnboardingSteps(canSeeAssinatura: boolean) {
  return canSeeAssinatura ? [...BASE_STEPS, ASSINATURA_STEP] : BASE_STEPS;
}

function normalizePath(pathname?: string | null) {
  const value = String(pathname || "/").trim() || "/";
  if (value === "/") return value;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getPainelOnboardingStepIndexForPath(
  pathname: string,
  steps: PainelOnboardingStep[]
) {
  const currentPath = normalizePath(pathname);
  const index = steps.findIndex((step) => {
    const stepPath = normalizePath(step.href);
    return currentPath === stepPath || currentPath.startsWith(`${stepPath}/`);
  });

  return index >= 0 ? index : 0;
}

export function getPainelOnboardingModuleId(pathname: string) {
  const normalized = normalizePath(pathname);

  if (normalized === "/") {
    return "dashboard";
  }

  const parts = normalized.split("/").filter(Boolean);
  return parts[0] || "dashboard";
}

export function getPainelOnboardingHighlights(
  snapshot?: PainelOnboardingSnapshot | null
) {
  const detalhes =
    snapshot?.detalhes && typeof snapshot.detalhes === "object"
      ? snapshot.detalhes
      : {};

  const highlights = [
    {
      label: "Score atual",
      value: `${safeNumber(snapshot?.scoreTotal)}/100`,
    },
    {
      label: "Dias com acesso",
      value: String(safeNumber(snapshot?.diasComAcesso)),
    },
    {
      label: "Modulos usados",
      value: String(safeNumber(snapshot?.modulosUsados)),
    },
  ];

  const pending = [
    safeNumber(detalhes.profissionais) < 2 ? "Equipe" : null,
    safeNumber(detalhes.servicos) < 5 ? "Servicos" : null,
    safeNumber(detalhes.clientes) < 5 ? "Clientes" : null,
    safeNumber(detalhes.agendamentos) < 3 ? "Agenda" : null,
    safeNumber(detalhes.vendas) < 1 ? "Primeira venda" : null,
    safeNumber(detalhes.caixas) < 1 ? "Caixa" : null,
  ].filter(Boolean) as string[];

  return {
    highlights,
    pending,
  };
}

export function getPainelOnboardingStepByModule(
  moduleId: string,
  steps: PainelOnboardingStep[]
) {
  return steps.find((step) => step.id === moduleId) || steps[0] || null;
}
