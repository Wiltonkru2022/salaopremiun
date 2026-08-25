"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Flag,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  Wallet,
  Webhook,
  X,
} from "lucide-react";
import type {
  AdminMasterPermissionKey,
  AdminMasterPermissions,
} from "@/lib/admin-master/auth/adminMasterPermissions";
import { ADMIN_MASTER_LOGIN_PATH } from "@/lib/admin-master/auth/login-path";
import type { AdminMasterShellData } from "@/lib/admin-master/data";
import AdminMasterGlobalSearch from "@/components/admin-master/AdminMasterGlobalSearch";
import AdminMasterNavigationRuntime from "@/components/admin-master/AdminMasterNavigationRuntime";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";

type Props = {
  children: ReactNode;
  adminId: string;
  adminName: string;
  adminEmail: string;
  perfil: string;
  permissions: AdminMasterPermissions;
  shellData: AdminMasterShellData;
};

type MenuItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  permission: AdminMasterPermissionKey;
  badge?: "alertas" | "tickets";
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const MAIN_GROUPS: MenuGroup[] = [
  {
    label: "Visão geral",
    items: [
      {
        href: "/admin-master",
        label: "Início",
        icon: LayoutDashboard,
        permission: "dashboard_ver",
      },
      {
        href: "/admin-master/saloes",
        label: "Salões",
        icon: Building2,
        permission: "saloes_ver",
      },
      {
        href: "/admin-master/financeiro",
        label: "Financeiro",
        icon: ChartNoAxesCombined,
        permission: "financeiro_ver",
      },
      {
        href: "/admin-master/assinaturas",
        label: "Assinaturas",
        icon: CreditCard,
        permission: "assinaturas_ver",
      },
    ],
  },
  {
    label: "Atendimento",
    items: [
      {
        href: "/admin-master/tickets",
        label: "Tickets",
        icon: Ticket,
        permission: "tickets_ver",
        badge: "tickets",
      },
      {
        href: "/admin-master/suporte",
        label: "Suporte",
        icon: Headphones,
        permission: "suporte_ver",
      },
      {
        href: "/admin-master/campanhas",
        label: "Campanhas",
        icon: Sparkles,
        permission: "comunicacao_ver",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        href: "/admin-master/planos",
        label: "Planos",
        icon: Flag,
        permission: "produto_ver",
      },
      {
        href: "/admin-master/relatorios",
        label: "Relatórios",
        icon: ChartNoAxesCombined,
        permission: "relatorios_ver",
      },
      {
        href: "/admin-master/usuarios-admin",
        label: "Equipe Admin",
        icon: Users,
        permission: "usuarios_admin_ver",
      },
    ],
  },
];

const ADVANCED_ITEMS: MenuItem[] = [
  {
    href: "/admin-master/operacao",
    label: "Operação",
    icon: Activity,
    permission: "operacao_ver",
  },
  {
    href: "/admin-master/saude",
    label: "Saúde do sistema",
    icon: ShieldCheck,
    permission: "operacao_ver",
    badge: "alertas",
  },
  {
    href: "/admin-master/alertas",
    label: "Alertas",
    icon: Bell,
    permission: "operacao_ver",
    badge: "alertas",
  },
  {
    href: "/admin-master/assinaturas/cobrancas",
    label: "Cobranças",
    icon: Wallet,
    permission: "cobrancas_ver",
  },
  {
    href: "/admin-master/notificacoes",
    label: "Notificações",
    icon: Bell,
    permission: "comunicacao_ver",
  },
  {
    href: "/admin-master/whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    permission: "whatsapp_ver",
  },
  {
    href: "/admin-master/blog",
    label: "Blog",
    icon: BookOpen,
    permission: "comunicacao_ver",
  },
  {
    href: "/admin-master/recursos",
    label: "Recursos",
    icon: Boxes,
    permission: "produto_ver",
  },
  {
    href: "/admin-master/feature-flags",
    label: "Feature flags",
    icon: Flag,
    permission: "produto_ver",
  },
  {
    href: "/admin-master/checklists",
    label: "Checklists",
    icon: ShieldCheck,
    permission: "dashboard_ver",
  },
  {
    href: "/admin-master/configuracoes-globais",
    label: "Configurações globais",
    icon: Settings,
    permission: "produto_ver",
  },
  {
    href: "/admin-master/seguranca",
    label: "Segurança",
    icon: ShieldCheck,
    permission: "operacao_ver",
  },
  {
    href: "/admin-master/webhooks",
    label: "Webhooks",
    icon: Webhook,
    permission: "operacao_ver",
  },
  {
    href: "/admin-master/logs",
    label: "Logs e auditoria",
    icon: Boxes,
    permission: "auditoria_ver",
  },
  {
    href: "/admin-master/saloes-excluidos",
    label: "Salões excluídos",
    icon: Trash2,
    permission: "saloes_ver",
  },
];

const PAGE_META = [
  ["/admin-master/assinaturas/cobrancas", "Cobranças", "Acompanhe pagamentos, falhas e inadimplência."],
  ["/admin-master/configuracoes-globais", "Configurações globais", "Preferências que afetam toda a plataforma."],
  ["/admin-master/saloes-excluidos", "Salões excluídos", "Histórico de contas removidas do sistema."],
  ["/admin-master/feature-flags", "Feature flags", "Controle recursos liberados na plataforma."],
  ["/admin-master/usuarios-admin", "Equipe Admin", "Acessos e permissões do time interno."],
  ["/admin-master/notificacoes", "Notificações", "Comunicações enviadas pela plataforma."],
  ["/admin-master/campanhas", "Campanhas", "Anúncios e comunicações para os salões."],
  ["/admin-master/financeiro", "Financeiro", "Receita e indicadores financeiros do SaaS."],
  ["/admin-master/assinaturas", "Assinaturas", "Planos contratados e situação das cobranças."],
  ["/admin-master/relatorios", "Relatórios", "Indicadores consolidados para gestão."],
  ["/admin-master/suporte", "Suporte", "Visão geral dos atendimentos."],
  ["/admin-master/tickets", "Tickets", "Pendências e solicitações que precisam de atenção."],
  ["/admin-master/saloes", "Salões", "Gerencie as contas que usam o SalãoPremium."],
  ["/admin-master/planos", "Planos", "Organize ofertas, preços e benefícios."],
  ["/admin-master/operacao", "Operação", "Acompanhe a estabilidade da plataforma."],
  ["/admin-master/saude", "Saúde do sistema", "Sinais técnicos e alertas operacionais."],
  ["/admin-master/alertas", "Alertas", "Problemas que exigem acompanhamento."],
  ["/admin-master/seguranca", "Segurança", "Controles e eventos de segurança."],
  ["/admin-master/webhooks", "Webhooks", "Integrações e entregas de eventos."],
  ["/admin-master/logs", "Logs e auditoria", "Histórico técnico e ações administrativas."],
  ["/admin-master/recursos", "Recursos", "Funcionalidades disponíveis nos planos."],
  ["/admin-master/checklists", "Checklists", "Rotinas internas de acompanhamento."],
  ["/admin-master/blog", "Blog", "Conteúdo publicado na plataforma."],
  ["/admin-master/whatsapp", "WhatsApp", "Configurações e operação do canal."],
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin-master") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function countBadge(badge: MenuItem["badge"], shellData: AdminMasterShellData) {
  if (badge === "alertas") return shellData.alertasCriticos;
  if (badge === "tickets") return shellData.ticketsAbertos;
  return 0;
}

function pageMeta(pathname: string) {
  const match = PAGE_META.find(([href]) => isActivePath(pathname, href));
  if (match) return { title: match[1], description: match[2] };
  return {
    title: "Visão geral",
    description: "O essencial do negócio, sem excesso de informação.",
  };
}

function MenuLink({
  item,
  pathname,
  shellData,
  onNavigate,
}: {
  item: MenuItem;
  pathname: string;
  shellData: AdminMasterShellData;
  onNavigate: () => void;
}) {
  const active = isActivePath(pathname, item.href);
  const badge = countBadge(item.badge, shellData);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-violet-50 text-violet-800"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
      }`}
    >
      <Icon
        size={18}
        className={active ? "text-violet-700" : "text-zinc-400 group-hover:text-zinc-700"}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge > 0 ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active ? "bg-violet-700 text-white" : "bg-red-100 text-red-700"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function AdminMasterShellSimpleClient({
  children,
  adminId,
  adminName,
  adminEmail,
  perfil,
  permissions,
  shellData,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(
    ADVANCED_ITEMS.some((item) => isActivePath(pathname, item.href))
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const groups = useMemo(
    () =>
      MAIN_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => permissions[item.permission]),
      })).filter((group) => group.items.length > 0),
    [permissions]
  );

  const advancedItems = useMemo(
    () => ADVANCED_ITEMS.filter((item) => permissions[item.permission]),
    [permissions]
  );

  const meta = pageMeta(pathname);

  async function handleAdminLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/admin-master/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
    } finally {
      router.push(ADMIN_MASTER_LOGIN_PATH);
      router.refresh();
    }
  }

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <AdminMasterNavigationRuntime />
      <MonitoringContextBridge
        actorType="admin_master"
        surface="admin_master"
        idAdminUsuario={adminId}
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-zinc-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-zinc-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-zinc-100 px-4">
          <Link href="/admin-master" onClick={closeMobile} className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-600">
              SalãoPremium
            </div>
            <div className="mt-1 text-lg font-black tracking-tight text-zinc-950">
              Admin Master
            </div>
          </Link>
          <button
            type="button"
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            onClick={closeMobile}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scroll-premium min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <MenuLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      shellData={shellData}
                      onNavigate={closeMobile}
                    />
                  ))}
                </div>
              </div>
            ))}

            {advancedItems.length ? (
              <div className="border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((value) => !value)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <Settings size={18} className="text-zinc-400" />
                  <span className="flex-1 text-left">Ferramentas avançadas</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {advancedOpen ? (
                  <div className="mt-1 space-y-1 border-l border-zinc-200 pl-2">
                    {advancedItems.map((item) => (
                      <MenuLink
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        shellData={shellData}
                        onNavigate={closeMobile}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>

        <div className="border-t border-zinc-100 p-3">
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                {(adminName || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-zinc-900">{adminName}</div>
                <div className="truncate text-[11px] text-zinc-500">{perfil}</div>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                disabled={signingOut}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white hover:text-zinc-900 disabled:opacity-50"
                aria-label="Sair"
                title={adminEmail}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[1520px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-700 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black tracking-tight text-zinc-950 sm:text-xl">
                {meta.title}
              </h1>
              <p className="hidden truncate text-xs text-zinc-500 sm:block">{meta.description}</p>
            </div>

            <div className="hidden min-w-[280px] max-w-[480px] flex-1 xl:block">
              <AdminMasterGlobalSearch />
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-600 transition hover:bg-zinc-50 xl:hidden"
              aria-label="Buscar"
            >
              <Search size={18} />
            </button>

            <Link
              href="/admin-master/alertas"
              className="relative rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-600 transition hover:bg-zinc-50"
              aria-label={`${shellData.alertasCriticos} alertas críticos`}
            >
              <Bell size={18} />
              {shellData.alertasCriticos > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-black leading-4 text-white">
                  {shellData.alertasCriticos > 99 ? "99+" : shellData.alertasCriticos}
                </span>
              ) : null}
            </Link>
          </div>

          {searchOpen ? (
            <div className="border-t border-zinc-100 px-4 py-3 xl:hidden">
              <div className="mx-auto max-w-[1520px]">
                <AdminMasterGlobalSearch />
              </div>
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1520px] min-w-0 p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
