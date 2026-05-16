import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Package,
  Receipt,
  Scissors,
  Settings,
  ShoppingCart,
  Sparkles,
  LifeBuoy,
  UserSquare2,
  Users,
  Wallet,
} from "lucide-react";

export type Permissoes = Record<string, boolean>;
export type PlanoRecursos = Record<string, boolean>;

export type PainelNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  permissionKey?: string;
  niveis?: string[];
  sidebar?: boolean;
  openInNewTab?: boolean;
};

const NAV_PLAN_FEATURE_MAP: Record<string, string> = {
  "/agenda": "agenda",
  "/clientes": "clientes",
  "/profissionais": "profissionais",
  "/servicos": "servicos",
  "/produtos": "produtos",
  "/estoque": "estoque",
  "/comandas": "comandas",
  "/vendas": "vendas",
  "/caixa": "caixa",
  "/comissoes": "comissoes_basicas",
  "/relatorio-financeiro": "relatorios_basicos",
  "/marketing": "marketing",
  "/novidades": "dashboard",
};

export const painelNavigationItems: PainelNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    description: "Panorama do salão em tempo real.",
    icon: LayoutDashboard,
    permissionKey: "dashboard_ver",
  },
  {
    href: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    description: "Visão diária de horários, encaixes e fluxo.",
    icon: CalendarDays,
    permissionKey: "agenda_ver",
    openInNewTab: true,
  },
  {
    href: "/clientes",
    label: "Clientes",
    shortLabel: "Clientes",
    description: "Cadastro, histórico e relacionamento.",
    icon: Users,
    permissionKey: "clientes_ver",
  },
  {
    href: "/profissionais",
    label: "Profissionais",
    shortLabel: "Time",
    description: "Equipe, agenda, acesso e repasses.",
    icon: UserSquare2,
    permissionKey: "profissionais_ver",
  },
  {
    href: "/servicos",
    label: "Serviços",
    shortLabel: "Serviços",
    description: "Catálogo, comissão e consumo por procedimento.",
    icon: Scissors,
    permissionKey: "servicos_ver",
  },
  {
    href: "/produtos",
    label: "Produtos",
    shortLabel: "Produtos",
    description: "Revenda, custo, margem e precificação.",
    icon: Package,
    permissionKey: "produtos_ver",
  },
  {
    href: "/estoque",
    label: "Estoque",
    shortLabel: "Estoque",
    description: "Entradas, saídas e alertas de reposição.",
    icon: Boxes,
    permissionKey: "estoque_ver",
  },
  {
    href: "/comandas",
    label: "Comandas",
    shortLabel: "Comandas",
    description: "Atendimento aberto e venda em andamento.",
    icon: Receipt,
    permissionKey: "comandas_ver",
  },
  {
    href: "/vendas",
    label: "Vendas",
    shortLabel: "Vendas",
    description: "Histórico, ajustes e impressão de cupom.",
    icon: ShoppingCart,
    permissionKey: "vendas_ver",
  },
  {
    href: "/caixa",
    label: "Caixa",
    shortLabel: "Caixa",
    description: "Fechamento de comanda e recebimentos.",
    icon: Wallet,
    permissionKey: "caixa_ver",
    openInNewTab: true,
  },
  {
    href: "/comissoes",
    label: "Comissões",
    shortLabel: "Comissões",
    description: "Lançar, revisar e ajustar repasses.",
    icon: BadgeDollarSign,
    permissionKey: "comissoes_ver",
  },
  {
    href: "/relatorio-financeiro",
    label: "Relatórios",
    shortLabel: "Relatórios",
    description: "Resultado, indicadores e leitura financeira.",
    icon: BarChart3,
    permissionKey: "relatorios_ver",
  },
  {
    href: "/marketing",
    label: "Marketing",
    shortLabel: "Marketing",
    description: "Ações de retorno, aniversários e campanhas.",
    icon: Megaphone,
    permissionKey: "marketing_ver",
  },
  {
    href: "/campanhas",
    label: "Campanhas",
    shortLabel: "Campanhas",
    description: "Cupons, recuperação e links de resgate.",
    icon: Megaphone,
    permissionKey: "dashboard_ver",
    niveis: ["admin"],
  },
  {
    href: "/novidades",
    label: "Novidades",
    shortLabel: "Novidades",
    description: "Roadmap, recursos novos e próximas entregas.",
    icon: Sparkles,
    permissionKey: "dashboard_ver",
  },
  {
    href: "/suporte",
    label: "Suporte",
    shortLabel: "Suporte",
    description: "Tickets, conversa com suporte e histórico do salão.",
    icon: LifeBuoy,
    permissionKey: "suporte_ver",
  },
  {
    href: "/perfil-salao",
    label: "Perfil do Salão",
    shortLabel: "Perfil",
    description: "Dados comerciais, logo, endereço e senha.",
    icon: Building2,
    permissionKey: "perfil_salao_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes/usuarios",
    label: "Usuários do sistema",
    shortLabel: "Usuários",
    description: "Acessos, perfis e limite do plano.",
    icon: Users,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes/caixa-taxas",
    label: "Caixa e Taxas",
    shortLabel: "Taxas",
    description: "Taxas, repasses e regras financeiras.",
    icon: CreditCard,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes/rateio",
    label: "Rateio e impressão",
    shortLabel: "Rateio",
    description: "Campos do documento de comissões.",
    icon: BadgeDollarSign,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes/agenda-horarios",
    label: "Agenda e horários",
    shortLabel: "Horários",
    description: "Funcionamento, abertura e intervalo.",
    icon: CalendarDays,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    shortLabel: "Config",
    description: "Regras do sistema, caixa e usuários.",
    icon: Settings,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/meu-plano",
    label: "Meu Plano",
    shortLabel: "Plano",
    description: "Recursos liberados, limites e bloqueios do plano.",
    icon: CreditCard,
    permissionKey: "assinatura_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/assinatura",
    label: "Assinatura",
    shortLabel: "Plano",
    description: "Plano, cobranças e renovação.",
    icon: CreditCard,
    permissionKey: "assinatura_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/comparar-planos",
    label: "Comparar Planos",
    shortLabel: "Planos",
    description: "Preço, limites e recursos liberados por plano.",
    icon: CreditCard,
    permissionKey: "assinatura_ver",
    niveis: ["admin"],
    sidebar: false,
  },
];

export function filterPainelNavigation(
  permissoes: Permissoes,
  nivel: string,
  planoRecursos?: PlanoRecursos
) {
  const nivelNormalizado = String(nivel || "").toLowerCase();

  return painelNavigationItems.filter((item) => {
    if (item.sidebar === false) return false;

    const permitidoPorNivel =
      !item.niveis || item.niveis.includes(nivelNormalizado);
    const permitidoPorPermissao =
      !item.permissionKey || permissoes?.[item.permissionKey] === true;
    const recursoPlano = NAV_PLAN_FEATURE_MAP[item.href];
    const permitidoPorPlano =
      !recursoPlano || planoRecursos?.[recursoPlano] !== false;

    return permitidoPorNivel && permitidoPorPermissao && permitidoPorPlano;
  });
}

export function getPainelPageMeta(pathname: string) {
  const match = [...painelNavigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

  if (match) {
    return {
      title: match.label,
      description: match.description,
    };
  }

  return {
    title: "Painel",
    description: "Operação, agenda, vendas e crescimento do salão.",
  };
}
