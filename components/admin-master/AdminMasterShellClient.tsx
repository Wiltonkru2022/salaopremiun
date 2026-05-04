"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Flag,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
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

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Negocio",
    items: [
      {
        href: "/admin-master",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: "dashboard_ver",
      },
      {
        href: "/admin-master/saloes",
        label: "Saloes",
        icon: Building2,
        permission: "saloes_ver",
      },
      {
        href: "/admin-master/financeiro",
        label: "Financeiro SaaS",
        icon: ChartNoAxesCombined,
        permission: "financeiro_ver",
      },
      {
        href: "/admin-master/relatorios",
        label: "Relatorios",
        icon: ChartNoAxesCombined,
        permission: "relatorios_ver",
      },
    ],
  },
  {
    label: "Receita",
    items: [
      {
        href: "/admin-master/assinaturas",
        label: "Assinaturas",
        icon: CreditCard,
        permission: "assinaturas_ver",
      },
      {
        href: "/admin-master/assinaturas/cobrancas",
        label: "Cobrancas",
        icon: Wallet,
        permission: "cobrancas_ver",
      },
      {
        href: "/admin-master/planos",
        label: "Planos",
        icon: Flag,
        permission: "produto_ver",
      },
      {
        href: "/admin-master/recursos",
        label: "Recursos",
        icon: Boxes,
        permission: "produto_ver",
      },
    ],
  },
  {
    label: "Operacao",
    items: [
      {
        href: "/admin-master/operacao",
        label: "Painel operacional",
        icon: Activity,
        permission: "operacao_ver",
      },
      {
        href: "/admin-master/saude",
        label: "Saude operacional",
        icon: ShieldCheck,
        permission: "operacao_ver",
        badge: "alertas",
      },
      {
        href: "/admin-master/webhooks",
        label: "Webhooks",
        icon: Webhook,
        permission: "operacao_ver",
      },
      {
        href: "/admin-master/logs",
        label: "Logs",
        icon: Boxes,
        permission: "auditoria_ver",
      },
      {
        href: "/admin-master/alertas",
        label: "Alertas",
        icon: ShieldCheck,
        permission: "operacao_ver",
        badge: "alertas",
      },
    ],
  },
  {
    label: "Suporte",
    items: [
      {
        href: "/admin-master/suporte",
        label: "Central de suporte",
        icon: Headphones,
        permission: "suporte_ver",
      },
      {
        href: "/admin-master/tickets",
        label: "Tickets",
        icon: Ticket,
        permission: "tickets_ver",
        badge: "tickets",
      },
      {
        href: "/admin-master/usuarios-admin",
        label: "Admins internos",
        icon: Users,
        permission: "usuarios_admin_ver",
      },
    ],
  },
  {
    label: "Comunicacao",
    items: [
      {
        href: "/admin-master/notificacoes",
        label: "Notificacoes",
        icon: Bell,
        permission: "comunicacao_ver",
      },
      {
        href: "/admin-master/campanhas",
        label: "Campanhas",
        icon: Sparkles,
        permission: "comunicacao_ver",
      },
      {
        href: "/admin-master/whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        permission: "whatsapp_ver",
      },
    ],
  },
  {
    label: "Produto",
    items: [
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
        label: "Configs globais",
        icon: Settings,
        permission: "produto_ver",
      },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin-master") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function countBadge(
  badge: MenuItem["badge"],
  shellData: AdminMasterShellData
) {
  if (badge === "alertas") return shellData.alertasCriticos;
  if (badge === "tickets") return shellData.ticketsAbertos;
  return 0;
}

export default function AdminMasterShellClient({
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
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const visibleGroups = useMemo(
    () =>
      MENU_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => permissions[item.permission]),
      })).filter((group) => group.items.length > 0),
    [permissions]
  );
  const collapsedAuditItems = shellData.auditoriaRecente.slice(0, 2);
  const visibleAuditItems = auditExpanded
    ? shellData.auditoriaRecente
    : collapsedAuditItems;
  const hiddenAuditCount = Math.max(
    shellData.auditoriaRecente.length - collapsedAuditItems.length,
    0
  );

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

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-zinc-950">
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
          className="fixed inset-0 z-40 bg-zinc-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r border-white/10 bg-zinc-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
              SalaoPremium
            </div>
            <div className="mt-2 font-display text-[1.55rem] font-bold">AdminMaster</div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 text-xs leading-5 text-zinc-300">
              Centro de comando do SaaS, cobrancas, suporte, produto e operacao.
            </div>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-white/10 p-2 text-zinc-300 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="scroll-premium min-h-0 flex-1 overflow-y-auto">
          <nav className="space-y-5 px-4 py-4">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500">
                  {group.label}
                </div>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(pathname, item.href);
                    const badge = countBadge(item.badge, shellData);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-white text-zinc-950 shadow-lg shadow-black/20"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={active ? "text-zinc-950" : "text-zinc-400"}
                        />
                        <span className="flex-1">{item.label}</span>
                        {badge > 0 ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              active
                                ? "bg-zinc-950 text-white"
                                : "bg-red-500/90 text-white"
                            }`}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-3.5 border-t border-white/10 p-4">
            {permissions.auditoria_ver ? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                      Auditoria recente
                    </div>
                    <div className="mt-2 text-xs leading-5 text-zinc-500">
                      O menu continua acessivel e a auditoria pode ser expandida quando precisar.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAuditExpanded((current) => !current)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:bg-white/10"
                  >
                    {auditExpanded ? "Ocultar" : "Abrir"}
                    {auditExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {visibleAuditItems.length ? (
                  <div
                    className={`mt-3 space-y-2.5 ${
                      auditExpanded ? "scroll-premium max-h-[280px] overflow-y-auto pr-1" : ""
                    }`}
                  >
                    {visibleAuditItems.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/5 p-2.5">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          {item.acao.replace(/_/g, " ")}
                        </div>
                        <div className="mt-1 line-clamp-1 text-sm font-semibold text-white">
                          {item.entidade}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                          {item.descricao}
                        </div>
                        <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                          {item.criadoEm}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-zinc-400">
                    Nenhum evento recente na auditoria.
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  <span>
                    {hiddenAuditCount > 0 && !auditExpanded
                      ? `+${hiddenAuditCount} eventos ocultos`
                      : "Painel resumido"}
                  </span>
                  <Link
                    href="/admin-master/logs"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-200 transition hover:bg-white/10"
                  >
                    Ver logs
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="rounded-[24px] bg-white p-3.5 text-zinc-950">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                    Admin logado
                  </div>
                  <div className="mt-2 truncate text-sm font-bold">
                    {adminName}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {adminEmail}
                  </div>
                  <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    {perfil}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdminLogout}
                  disabled={signingOut}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-zinc-700 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={14} />
                  {signingOut ? "Saindo" : "Sair"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#f7f5ef]/92 px-4 py-3.5 backdrop-blur-xl sm:px-5">
          <div className="mx-auto max-w-[1600px] space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={18} />
                </button>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    Painel interno
                  </div>
                  <h1 className="font-display text-[1.45rem] font-bold text-zinc-950">
                    AdminMaster
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin-master/alertas"
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                >
                  Alertas {shellData.alertasCriticos}
                </Link>
                <Link
                  href="/admin-master"
                  className="rounded-full bg-zinc-950 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  Dashboard admin
                </Link>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  disabled={signingOut}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={16} />
                  {signingOut ? "Saindo..." : "Sair"}
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <AdminMasterGlobalSearch />

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin-master/tickets"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:border-zinc-950 hover:bg-zinc-50"
                >
                  Tickets abertos
                  <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs text-white">
                    {shellData.ticketsAbertos}
                  </span>
                </Link>
                <Link
                  href="/admin-master/planos"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:border-zinc-950 hover:bg-zinc-50"
                >
                  Planos e recursos
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] min-w-0 p-3 sm:p-4 lg:p-5 xl:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
