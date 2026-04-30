export type PlanoCodigo = "teste_gratis" | "basico" | "pro" | "premium";

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
    descricao: "Ideal para validar agenda, caixa e fluxo de venda sem compromisso.",
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
      "App profissional",
      "WhatsApp",
      "Campanhas",
      "Comissões avançadas",
      "Relatórios avançados",
      "Dashboard avançado",
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
    descricao: "Plano enxuto para rodar agenda, caixa e venda sem pagar por estrutura que ainda não usa.",
    foco: "Salão pequeno operando bem",
    idealPara: "Operação pequena, de 1 a 3 profissionais.",
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
    ],
    recursosBloqueados: [
      "Estoque",
      "Marketing",
      "App profissional",
      "WhatsApp",
      "Campanhas",
      "Comissões avançadas",
      "Relatórios avançados",
      "Dashboard avançado",
    ],
    limites: {
      usuarios: 2,
      profissionais: 3,
      clientes: 2000,
      servicos: 80,
      agendamentosMensais: 250,
    },
  },
  pro: {
    codigo: "pro",
    nome: "Pro",
    subtitulo: "Estrutura para equipe em crescimento.",
    descricao: "Libera operação mais densa, relatórios mais fortes e app profissional para a equipe ganhar autonomia.",
    foco: "Equipe em crescimento",
    idealPara: "Salões em expansão, com mais atendimento e gestão.",
    valorMensal: 89.9,
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
      "Relatórios avançados",
      "Dashboard avançado",
      "App profissional",
      "Marketing",
    ],
    recursosBloqueados: ["WhatsApp avançado", "Campanhas premium"],
    limites: {
      usuarios: 5,
      profissionais: 10,
      clientes: 10000,
      servicos: 250,
      agendamentosMensais: 900,
    },
  },
  premium: {
    codigo: "premium",
    nome: "Premium",
    subtitulo: "Tudo liberado para operação sem teto prático.",
    descricao: "Plano completo para quem já opera pesado ou quer crescer sem bater em limite de estrutura.",
    foco: "Tudo liberado",
    idealPara: "Operação madura, multiatendimento e gestão completa.",
    valorMensal: 149.9,
    ordem: 3,
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
      "Relatórios avançados",
      "Dashboard avançado",
      "WhatsApp",
      "Campanhas",
      "App profissional",
      "Marketing",
      "Recursos beta",
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
