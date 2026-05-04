export type PlanoCodigo = "teste_gratis" | "basico" | "pro" | "premium";
export type PlanoCobravelCodigo = Exclude<PlanoCodigo, "teste_gratis">;
export type PlanoRecursoUpgrade =
  | "dashboard_avancado"
  | "relatorios_avancados"
  | "comissoes_avancadas"
  | "app_profissional"
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
    nome: "Teste gratis",
    subtitulo: "Prove a operacao antes de pagar.",
    descricao:
      "Ideal para validar agenda, caixa e fluxo de venda sem compromisso.",
    foco: "Provar a operacao",
    idealPara: "Quem quer testar o sistema antes de assinar.",
    valorMensal: 0,
    ordem: 0,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Servicos",
      "Servicos extras",
      "Produtos",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissoes basicas",
      "Relatorios basicos",
    ],
    recursosBloqueados: [
      "Estoque",
      "Marketing",
      "App profissional",
      "WhatsApp",
      "Campanhas",
      "Comissoes avancadas",
      "Relatorios avancados",
      "Dashboard avancado",
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
    nome: "Basico",
    subtitulo: "O essencial para um salao pequeno operar bem.",
    descricao:
      "Plano enxuto para rodar agenda, caixa e venda sem pagar por estrutura que ainda nao usa.",
    foco: "Salao pequeno operando bem",
    idealPara: "Operacao pequena, de 1 a 3 profissionais.",
    valorMensal: 5,
    ordem: 1,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Servicos",
      "Servicos extras",
      "Produtos",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissoes basicas",
      "Relatorios basicos",
    ],
    recursosBloqueados: [
      "Estoque",
      "Marketing",
      "App profissional",
      "WhatsApp",
      "Campanhas",
      "Comissoes avancadas",
      "Relatorios avancados",
      "Dashboard avancado",
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
    descricao:
      "Libera operacao mais densa, relatorios mais fortes e app profissional para a equipe ganhar autonomia.",
    foco: "Equipe em crescimento",
    idealPara: "Saloes em expansao, com mais atendimento e gestao.",
    valorMensal: 89.9,
    ordem: 2,
    destaque: true,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Servicos",
      "Servicos extras",
      "Produtos",
      "Estoque",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissoes basicas",
      "Comissoes avancadas",
      "Relatorios basicos",
      "Relatorios avancados",
      "Dashboard avancado",
      "App profissional",
    ],
    recursosBloqueados: ["Marketing", "WhatsApp avancado", "Campanhas premium"],
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
    subtitulo: "Tudo liberado para operacao sem teto pratico.",
    descricao:
      "Plano completo para quem ja opera pesado ou quer crescer sem bater em limite de estrutura.",
    foco: "Tudo liberado",
    idealPara: "Operacao madura, multiatendimento e gestao completa.",
    valorMensal: 149.9,
    ordem: 3,
    destaque: true,
    recursosLiberados: [
      "Agenda",
      "Clientes",
      "Profissionais",
      "Servicos",
      "Servicos extras",
      "Produtos",
      "Estoque",
      "Caixa",
      "Comandas",
      "Vendas",
      "Comissoes basicas",
      "Comissoes avancadas",
      "Relatorios basicos",
      "Relatorios avancados",
      "Dashboard avancado",
      "WhatsApp",
      "Campanhas",
      "App profissional",
      "Recursos beta",
      "Suporte prioritario",
    ],
    recursosBloqueados: ["Marketing"],
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
    recurso === "estoque" ||
    recurso === "marketing"
  ) {
    return "pro";
  }

  if (recurso === "whatsapp" || recurso === "campanhas") {
    return "premium";
  }

  return "pro";
}
