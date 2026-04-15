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
  UserSquare2,
  Users,
  Wallet,
} from "lucide-react";

export type Permissoes = Record<string, boolean>;

export type PainelNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  permissionKey?: string;
  niveis?: string[];
  sidebar?: boolean;
};

export const painelNavigationItems: PainelNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    description: "Panorama do salao em tempo real.",
    icon: LayoutDashboard,
    permissionKey: "dashboard_ver",
  },
  {
    href: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    description: "Visao diaria de horarios, encaixes e fluxo.",
    icon: CalendarDays,
    permissionKey: "agenda_ver",
  },
  {
    href: "/clientes",
    label: "Clientes",
    shortLabel: "Clientes",
    description: "Cadastro, historico e relacionamento.",
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
    label: "Servicos",
    shortLabel: "Servicos",
    description: "Catalogo, comissao e consumo por procedimento.",
    icon: Scissors,
    permissionKey: "servicos_ver",
  },
  {
    href: "/produtos",
    label: "Produtos",
    shortLabel: "Produtos",
    description: "Revenda, custo, margem e precificacao.",
    icon: Package,
    permissionKey: "produtos_ver",
  },
  {
    href: "/estoque",
    label: "Estoque",
    shortLabel: "Estoque",
    description: "Entradas, saidas e alertas de reposicao.",
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
    description: "Historico, ajustes e impressao de cupom.",
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
  },
  {
    href: "/comissoes",
    label: "Comissoes",
    shortLabel: "Comissoes",
    description: "Lancar, revisar e ajustar repasses.",
    icon: BadgeDollarSign,
    permissionKey: "comissoes_ver",
  },
  {
    href: "/relatorio_financeiro",
    label: "Relatorios",
    shortLabel: "Relatorios",
    description: "Resultado, indicadores e leitura financeira.",
    icon: BarChart3,
    permissionKey: "relatorios_ver",
  },
  {
    href: "/marketing",
    label: "Marketing",
    shortLabel: "Marketing",
    description: "Acoes de retorno, aniversarios e campanhas.",
    icon: Megaphone,
    permissionKey: "marketing_ver",
  },
  {
    href: "/perfil-salao",
    label: "Perfil do Salao",
    shortLabel: "Perfil",
    description: "Dados comerciais, logo, endereco e senha.",
    icon: Building2,
    permissionKey: "perfil_salao_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes/usuarios",
    label: "Usuarios do Sistema",
    shortLabel: "Usuarios",
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
    href: "/configuracoes/agenda-horarios",
    label: "Agenda e Horarios",
    shortLabel: "Horarios",
    description: "Funcionamento, abertura e intervalo.",
    icon: CalendarDays,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes/sistema",
    label: "Sistema",
    shortLabel: "Sistema",
    description: "Preferencias e regras gerais.",
    icon: Settings,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/configuracoes",
    label: "Configuracoes",
    shortLabel: "Config",
    description: "Regras do sistema, caixa e usuarios.",
    icon: Settings,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
    sidebar: false,
  },
  {
    href: "/assinatura",
    label: "Assinatura",
    shortLabel: "Plano",
    description: "Plano, cobrancas e renovacao.",
    icon: CreditCard,
    permissionKey: "assinatura_ver",
    niveis: ["admin"],
    sidebar: false,
  },
];

export function filterPainelNavigation(
  permissoes: Permissoes,
  nivel: string
) {
  const nivelNormalizado = String(nivel || "").toLowerCase();

  return painelNavigationItems.filter((item) => {
    if (item.sidebar === false) return false;

    const permitidoPorNivel =
      !item.niveis || item.niveis.includes(nivelNormalizado);
    const permitidoPorPermissao =
      !item.permissionKey || permissoes?.[item.permissionKey] === true;

    return permitidoPorNivel && permitidoPorPermissao;
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
    description: "Operacao, agenda, vendas e crescimento do salao.",
  };
}
