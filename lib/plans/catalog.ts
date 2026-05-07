export type PlanoCodigo = "teste_gratis" | "basico" | "pro" | "premium";
export type PlanoCobravelCodigo = Exclude<PlanoCodigo, "teste_gratis">;
export type PlanoRecursoUpgrade =
  | "dashboard_avancado"
  | "relatorios_avancados"
  | "comissoes_avancadas"
  | "app_profissional"
  | "app_cliente"
  | "estoque"
  | "marketing"
  | "whatsapp"
  | "campanhas";

export type PlanoLimitesCatalogo = {
  usuarios: number | null;
  profissionais: number | null;
  clientes: number | null;
  servicos: number | null;
  agendamentosMensais: number | null;
};

export type PlanoCatalogo = {
  codigo: PlanoCodigo;
  nome: string;
  subtitulo: string;
  descricao: string;
  foco: string;
  idealPara: string;
  valorMensal: number;
  ordem: number;
  destaque?: boolean;
  recursosLiberados: string[];
  recursosBloqueados: string[];
  limites: PlanoLimitesCatalogo;
};

export const PLANOS_CATALOGO: Record<PlanoCodigo, PlanoCatalogo> = {
  teste_gratis: {
    codigo: "teste_gratis",
    nome: "Teste grátis",
    subtitulo: "Prove a operação antes de pagar.",
    descricao:
      "Ideal para validar agenda, caixa e fluxo de venda sem compromisso.",
    foco: "Provar a operação",
    idealPara: "Quem quer testar o sistema antes de assinar.",
    valorMensal: 0,
    ordem: 0,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Serviços",
      "Serviços extras",
      "Produtos",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissões básicas",
      "Relatórios básicos",
    ],
    recursosBloqueados: [
      "Estoque",
      "Marketing",
      "App do profissional",
      "App do cliente",
      "Campanhas",
      "Comissões avançadas",
      "Relatórios e dashboard avançados",
    ],
    limites: {
      usuarios: 1,
      profissionais: 3,
      clientes: 100,
      servicos: 20,
      agendamentosMensais: 40,
    },
  },
  basico: {
    codigo: "basico",
    nome: "Básico",
    subtitulo: "O essencial para um salão pequeno operar bem.",
    descricao:
      "Plano enxuto para agenda, clientes, serviços, comandas, caixa, vendas e comissão básica.",
    foco: "Operação pequena",
    idealPara: "Salão pequeno, de 1 a 3 profissionais.",
    valorMensal: 5,
    ordem: 1,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Serviços",
      "Serviços extras",
      "Produtos",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissões básicas",
      "Relatórios básicos",
      "Agenda com link manual do WhatsApp",
    ],
    recursosBloqueados: [
      "Estoque",
      "App do profissional",
      "App do cliente",
      "Comissões avançadas",
      "Relatórios e dashboard avançados",
      "Suporte prioritário",
    ],
    limites: {
      usuarios: 2,
      profissionais: 3,
      clientes: null,
      servicos: 80,
      agendamentosMensais: 250,
    },
  },
  pro: {
    codigo: "pro",
    nome: "Pro",
    subtitulo: "Estrutura para equipe em crescimento.",
    descricao:
      "Tudo do Básico, com estoque, comissões avançadas, relatórios melhores e apps para profissional e cliente.",
    foco: "Equipe em crescimento",
    idealPara: "Salões em expansão, com mais atendimento e gestão.",
    valorMensal: 29.9,
    ordem: 2,
    destaque: true,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Serviços",
      "Serviços extras",
      "Produtos",
      "Estoque",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissões básicas",
      "Comissões avançadas",
      "Relatórios básicos",
      "Relatórios e dashboard avançados",
      "App do profissional",
      "App do cliente",
      "Agenda com link manual do WhatsApp",
    ],
    recursosBloqueados: ["Suporte prioritário"],
    limites: {
      usuarios: 5,
      profissionais: 10,
      clientes: null,
      servicos: 250,
      agendamentosMensais: 900,
    },
  },
  premium: {
    codigo: "premium",
    nome: "Premium",
    subtitulo: "Tudo liberado para operação sem teto prático.",
    descricao:
      "Plano completo para operar sem limite prático de agenda, profissionais, usuários e serviços.",
    foco: "Tudo liberado",
    idealPara: "Operação madura, multiatendimento e gestão completa.",
    valorMensal: 59.9,
    ordem: 3,
    destaque: true,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Serviços",
      "Serviços extras",
      "Produtos",
      "Estoque",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissões básicas",
      "Comissões avançadas",
      "Relatórios básicos",
      "Relatórios e dashboard avançados",
      "App do profissional",
      "App do cliente",
      "Agenda com link manual do WhatsApp",
      "Suporte prioritário",
    ],
    recursosBloqueados: [],
    limites: {
      usuarios: null,
      profissionais: null,
      clientes: null,
      servicos: null,
      agendamentosMensais: null,
    },
  },
};

export type PlanoTabelaFeature = {
  grupo: string;
  nome: string;
  basico: string;
  pro: string;
  premium: string;
};

export const PLANOS_TABELA_FEATURES: PlanoTabelaFeature[] = [
  {
    grupo: "Limites",
    nome: "Agendamentos",
    basico: "250 / mês",
    pro: "900 / mês",
    premium: "Ilimitado",
  },
  {
    grupo: "Limites",
    nome: "Profissionais",
    basico: "3",
    pro: "10",
    premium: "Ilimitado",
  },
  {
    grupo: "Limites",
    nome: "Usuários do sistema",
    basico: "2",
    pro: "5",
    premium: "Ilimitado",
  },
  {
    grupo: "Limites",
    nome: "Serviços cadastrados",
    basico: "80",
    pro: "250",
    premium: "Ilimitado",
  },
  {
    grupo: "Limites",
    nome: "Clientes",
    basico: "Ilimitado",
    pro: "Ilimitado",
    premium: "Ilimitado",
  },
  {
    grupo: "Gestão e operação",
    nome: "Agenda com link manual do WhatsApp",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Gestão e operação",
    nome: "Cadastro de clientes e serviços",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Gestão e operação",
    nome: "Serviços extras e produtos",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Gestão e operação",
    nome: "Comandas e caixa",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Gestão e operação",
    nome: "Controle de estoque",
    basico: "Não liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Financeiro e relatórios",
    nome: "Vendas",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Financeiro e relatórios",
    nome: "Comissões básicas",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Financeiro e relatórios",
    nome: "Relatórios básicos",
    basico: "Liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Financeiro e relatórios",
    nome: "Comissões avançadas",
    basico: "Não liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Financeiro e relatórios",
    nome: "Relatórios e dashboard avançados",
    basico: "Não liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Aplicativos e autoridade",
    nome: "App do profissional",
    basico: "Não liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Aplicativos e autoridade",
    nome: "App do cliente (agendamento)",
    basico: "Não liberado",
    pro: "Liberado",
    premium: "Liberado",
  },
  {
    grupo: "Aplicativos e autoridade",
    nome: "Suporte prioritário",
    basico: "Não liberado",
    pro: "Não liberado",
    premium: "Liberado",
  },
];

export function getPlanoCatalogo(plano?: string | null) {
  const codigo = String(plano || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  if (codigo === "basico" || codigo === "pro" || codigo === "premium") {
    return PLANOS_CATALOGO[codigo];
  }

  return PLANOS_CATALOGO.teste_gratis;
}

export function getPlanosOrdenados() {
  return Object.values(PLANOS_CATALOGO).sort((a, b) => a.ordem - b.ordem);
}

export function getPlanosCobraveisOrdenados() {
  return getPlanosOrdenados().filter((plano) => plano.codigo !== "teste_gratis");
}

export function getPlanoUpgradeCatalogo(plano?: string | null) {
  const planoAtual = getPlanoCatalogo(plano);
  const planosCobraveis = getPlanosCobraveisOrdenados();

  if (planoAtual.codigo === "teste_gratis") {
    return planosCobraveis[0] ?? null;
  }

  const currentIndex = planosCobraveis.findIndex(
    (item) => item.codigo === planoAtual.codigo
  );

  if (currentIndex === -1) return planosCobraveis[0] ?? null;
  return planosCobraveis[currentIndex + 1] ?? null;
}

export function getPlanoDowngradeCatalogo(plano?: string | null) {
  const planoAtual = getPlanoCatalogo(plano);
  const planosCobraveis = getPlanosCobraveisOrdenados();
  const currentIndex = planosCobraveis.findIndex(
    (item) => item.codigo === planoAtual.codigo
  );

  if (currentIndex <= 0) return null;
  return planosCobraveis[currentIndex - 1] ?? null;
}

export function getPlanoMinimoParaRecurso(
  recurso: PlanoRecursoUpgrade
): PlanoCobravelCodigo {
  if (
    recurso === "dashboard_avancado" ||
    recurso === "relatorios_avancados" ||
    recurso === "comissoes_avancadas" ||
    recurso === "app_profissional" ||
    recurso === "app_cliente" ||
    recurso === "estoque"
  ) {
    return "pro";
  }

  if (recurso === "whatsapp") {
    return "basico";
  }

  if (recurso === "campanhas" || recurso === "marketing") {
    return "premium";
  }

  return "pro";
}
