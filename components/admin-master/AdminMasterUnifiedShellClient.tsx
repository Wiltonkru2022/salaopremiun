"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  CreditCard,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  Webhook,
  X,
} from "lucide-react";
import AdminMasterGlobalSearch from "@/components/admin-master/AdminMasterGlobalSearch";
import AdminMasterNavigationRuntime from "@/components/admin-master/AdminMasterNavigationRuntime";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";
import { ADMIN_MASTER_LOGIN_PATH } from "@/lib/admin-master/auth/login-path";
import type { AdminMasterPermissionKey, AdminMasterPermissions } from "@/lib/admin-master/auth/adminMasterPermissions";
import type { AdminMasterShellData } from "@/lib/admin-master/data";

type Props = {
  children: ReactNode;
  adminId: string;
  adminName: string;
  adminEmail: string;
  perfil: string;
  permissions: AdminMasterPermissions;
  shellData: AdminMasterShellData;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  permission: AdminMasterPermissionKey;
  badge?: "tickets" | "alertas";
};

type ContextItem = {
  href: string;
  label: string;
  permission: AdminMasterPermissionKey;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Principal",
    items: [
      { href: "/admin-master", label: "Início", icon: LayoutDashboard, permission: "dashboard_ver" },
      { href: "/admin-master/saloes", label: "Salões", icon: Building2, permission: "saloes_ver" },
      { href: "/admin-master/financeiro", label: "Financeiro", icon: ChartNoAxesCombined, permission: "financeiro_ver" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin-master/assinaturas", label: "Assinaturas", icon: CreditCard, permission: "assinaturas_ver" },
      { href: "/admin-master/tickets", label: "Atendimento", icon: Ticket, permission: "tickets_ver", badge: "tickets" },
      { href: "/admin-master/campanhas", label: "Campanhas", icon: Sparkles, permission: "comunicacao_ver" },
      { href: "/admin-master/planos", label: "Produto e planos", icon: Flag, permission: "produto_ver" },
      { href: "/admin-master/relatorios", label: "Relatórios", icon: ChartNoAxesCombined, permission: "relatorios_ver" },
    ],
  },
];

const SYSTEM_ITEMS: NavItem[] = [
  { href: "/admin-master/saude", label: "Saúde do sistema", icon: Activity, permission: "operacao_ver", badge: "alertas" },
  { href: "/admin-master/whatsapp", label: "WhatsApp", icon: MessageCircle, permission: "whatsapp_ver" },
  { href: "/admin-master/configuracoes-globais", label: "Configurações", icon: Settings, permission: "produto_ver" },
  { href: "/admin-master/logs", label: "Diagnóstico técnico", icon: Webhook, permission: "auditoria_ver" },
  { href: "/admin-master/usuarios-admin", label: "Equipe Admin", icon: Users, permission: "usuarios_admin_ver" },
  { href: "/admin-master/seguranca", label: "Segurança", icon: ShieldCheck, permission: "operacao_ver" },
  { href: "/admin-master/saloes-excluidos", label: "Salões excluídos", icon: Trash2, permission: "saloes_ver" },
];

const CONTEXT_GROUPS: Array<{
  match: (pathname: string) => boolean;
  label: string;
  items: ContextItem[];
}> = [
  {
    match: (p) => p.startsWith("/admin-master/assinaturas"),
    label: "Assinaturas",
    items: [
      { href: "/admin-master/assinaturas", label: "Visão geral", permission: "assinaturas_ver" },
      { href: "/admin-master/assinaturas/cobrancas", label: "Cobranças", permission: "cobrancas_ver" },
    ],
  },
  {
    match: (p) => p.startsWith("/admin-master/tickets") || p.startsWith("/admin-master/suporte"),
    label: "Atendimento",
    items: [
      { href: "/admin-master/tickets", label: "Tickets", permission: "tickets_ver" },
      { href: "/admin-master/suporte", label: "Visão do suporte", permission: "suporte_ver" },
    ],
  },
  {
    match: (p) => ["/admin-master/campanhas", "/admin-master/parcerias", "/admin-master/notificacoes", "/admin-master/blog"].some((base) => p.startsWith(base)),
    label: "Comunicação",
    items: [
      { href: "/admin-master/campanhas", label: "Campanhas", permission: "comunicacao_ver" },
      { href: "/admin-master/parcerias", label: "Parcerias", permission: "comunicacao_ver" },
      { href: "/admin-master/notificacoes", label: "Notificações", permission: "comunicacao_ver" },
      { href: "/admin-master/blog", label: "Blog", permission: "comunicacao_ver" },
    ],
  },
  {
    match: (p) => ["/admin-master/planos", "/admin-master/recursos", "/admin-master/feature-flags", "/admin-master/configuracoes-globais", "/admin-master/checklists"].some((base) => p.startsWith(base)),
    label: "Produto",
    items: [
      { href: "/admin-master/planos", label: "Planos", permission: "produto_ver" },
      { href: "/admin-master/recursos", label: "Recursos", permission: "produto_ver" },
      { href: "/admin-master/feature-flags", label: "Feature flags", permission: "produto_ver" },
      { href: "/admin-master/configuracoes-globais", label: "Configurações", permission: "produto_ver" },
      { href: "/admin-master/checklists", label: "Checklists", permission: "produto_ver" },
    ],
  },
  {
    match: (p) => ["/admin-master/saude", "/admin-master/alertas", "/admin-master/operacao", "/admin-master/logs", "/admin-master/webhooks"].some((base) => p.startsWith(base)),
    label: "Operação",
    items: [
      { href: "/admin-master/saude", label: "Saúde", permission: "operacao_ver" },
      { href: "/admin-master/alertas", label: "Alertas", permission: "operacao_ver" },
      { href: "/admin-master/logs", label: "Logs", permission: "auditoria_ver" },
      { href: "/admin-master/webhooks", label: "Webhooks", permission: "operacao_ver" },
    ],
  },
  {
    match: (p) => p.startsWith("/admin-master/whatsapp"),
    label: "WhatsApp",
    items: [
      { href: "/admin-master/whatsapp", label: "Visão geral", permission: "whatsapp_ver" },
      { href: "/admin-master/whatsapp/pacotes", label: "Pacotes", permission: "whatsapp_ver" },
      { href: "/admin-master/whatsapp/tarifas", label: "Tarifas", permission: "whatsapp_ver" },
      { href: "/admin-master/whatsapp/templates", label: "Templates", permission: "whatsapp_ver" },
      { href: "/admin-master/whatsapp/recargas", label: "Recargas", permission: "whatsapp_ver" },
    ],
  },
];

const PAGE_META: Array<[string, string, string]> = [
  ["/admin-master/assinaturas/cobrancas", "Cobranças", "Pagamentos, vencimentos e falhas de cobrança."],
  ["/admin-master/configuracoes-globais", "Configurações", "Preferências globais organizadas por impacto."],
  ["/admin-master/saloes-excluidos", "Salões excluídos", "Retenção, restauração e exclusões definitivas."],
  ["/admin-master/feature-flags", "Feature flags", "Liberação controlada de recursos por escopo."],
  ["/admin-master/usuarios-admin", "Equipe Admin", "Perfis, acessos e permissões internas."],
  ["/admin-master/notificacoes", "Notificações", "Envios, histórico e falhas de comunicação."],
  ["/admin-master/parcerias", "Parcerias", "Empresas, criativos e campanhas parceiras."],
  ["/admin-master/campanhas", "Campanhas", "Público, criativo, exibição e resultado."],
  ["/admin-master/financeiro", "Financeiro", "Receita, inadimplência e movimentação do SaaS."],
  ["/admin-master/assinaturas", "Assinaturas", "Ciclo de trial, ativação, vencimento e cancelamento."],
  ["/admin-master/relatorios", "Relatórios", "Indicadores consolidados para tomada de decisão."],
  ["/admin-master/suporte", "Suporte", "Backlog, SLA e prioridades do atendimento."],
  ["/admin-master/tickets", "Tickets", "Fila de solicitações e acompanhamento de SLA."],
  ["/admin-master/saloes", "Salões", "Contas, situação e uso da plataforma."],
  ["/admin-master/planos", "Produto e planos", "Preços, limites e recursos oferecidos."],
  ["/admin-master/recursos", "Recursos", "Matriz de funcionalidades dos planos."],
  ["/admin-master/checklists", "Checklists", "Critérios e regras operacionais de onboarding."],
  ["/admin-master/saude", "Saúde do sistema", "Visão geral da estabilidade e impacto."],
  ["/admin-master/alertas", "Alertas", "Problemas que exigem ação agora."],
  ["/admin-master/operacao", "Saúde do sistema", "Visão geral da estabilidade e impacto."],
  ["/admin-master/seguranca", "Segurança", "Controles e eventos de segurança."],
  ["/admin-master/webhooks", "Webhooks", "Entregas, falhas e reprocessamento de integrações."],
  ["/admin-master/logs", "Diagnóstico técnico", "Logs, auditoria e investigação avançada."],
  ["/admin-master/blog", "Blog", "Conteúdo e publicações da plataforma."],
  ["/admin-master/whatsapp", "WhatsApp", "Configuração, pacotes, templates e recargas."],
];

function isActive(pathname: string, href: string) {
  if (href === "/admin-master") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pageMeta(pathname: string) {
  const match = PAGE_META.find(([href]) => isActive(pathname, href));
  return match
    ? { title: match[1], description: match[2] }
    : { title: "Visão geral", description: "O essencial da operação do SalãoPremium." };
}

function badgeValue(kind: NavItem["badge"], shellData: AdminMasterShellData) {
  if (kind === "tickets") return shellData.ticketsAbertos;
  if (kind === "alertas") return shellData.alertasCriticos;
  return 0;
}

export default function AdminMasterUnifiedShellClient({
  children,
  adminId,
  adminName,
  adminEmail,
  perfil,
  permissions,
  shellData,
}: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(() => SYSTEM_ITEMS.some((item) => isActive(pathname, item.href)));
  const [signingOut, setSigningOut] = useState(false);
  const meta = pageMeta(pathname);

  const groups = useMemo(
    () => NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => permissions[item.permission]) })).filter((group) => group.items.length),
    [permissions]
  );
  const systemItems = useMemo(() => SYSTEM_ITEMS.filter((item) => permissions[item.permission]), [permissions]);
  const context = CONTEXT_GROUPS.find((group) => group.match(pathname));
  const contextItems = context?.items.filter((item) => permissions[item.permission]) ?? [];

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/admin-master/auth/logout", { method: "POST", cache: "no-store", credentials: "same-origin" });
    } finally {
      window.location.assign(ADMIN_MASTER_LOGIN_PATH);
    }
  }

  function navLink(item: NavItem) {
    const active = isActive(pathname, item.href);
    const badge = badgeValue(item.badge, shellData);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-violet-50 text-violet-800" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"}`}
      >
        <Icon size={18} className={active ? "text-violet-700" : "text-zinc-400"} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge > 0 ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">{badge}</span> : null}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <AdminMasterNavigationRuntime />
      <MonitoringContextBridge actorType="admin_master" surface="admin_master" idAdminUsuario={adminId} />

      {mobileOpen ? <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-40 bg-zinc-950/35 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-zinc-200 bg-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-zinc-100 px-4">
          <Link href="/admin-master" className="min-w-0" onClick={() => setMobileOpen(false)}>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-600">SalãoPremium</div>
            <div className="mt-1 text-lg font-black tracking-tight">Admin Master</div>
          </Link>
          <button type="button" className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{group.label}</div>
                <div className="space-y-1">{group.items.map(navLink)}</div>
              </div>
            ))}

            {systemItems.length ? (
              <div className="border-t border-zinc-100 pt-4">
                <button type="button" onClick={() => setSystemOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
                  <Settings size={18} className="text-zinc-400" />
                  <span className="flex-1 text-left">Sistema</span>
                  <ChevronDown size={15} className={`transition ${systemOpen ? "rotate-180" : ""}`} />
                </button>
                {systemOpen ? <div className="mt-1 space-y-1">{systemItems.map(navLink)}</div> : null}
              </div>
            ) : null}
          </nav>
        </div>

        <div className="border-t border-zinc-100 p-3">
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="truncate text-sm font-black text-zinc-900">{adminName || "Administrador"}</div>
            <div className="mt-0.5 truncate text-xs text-zinc-500">{adminEmail}</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">{perfil}</span>
              <button type="button" onClick={logout} disabled={signingOut} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-500 hover:bg-white hover:text-rose-700 disabled:opacity-50">
                <LogOut size={14} /> {signingOut ? "Saindo" : "Sair"}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-[#f6f7fb]/95 backdrop-blur">
          <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 lg:hidden" aria-label="Abrir menu"><Menu size={19} /></button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-black tracking-tight text-zinc-950">{meta.title}</div>
              <div className="hidden truncate text-xs text-zinc-500 sm:block">{meta.description}</div>
            </div>
            <div className="hidden min-w-[280px] max-w-[420px] flex-1 md:block"><AdminMasterGlobalSearch /></div>
            {shellData.alertasCriticos > 0 && permissions.operacao_ver ? (
              <Link href="/admin-master/alertas" className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:text-rose-700" aria-label="Alertas críticos">
                <Bell size={18} />
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">{shellData.alertasCriticos}</span>
              </Link>
            ) : null}
          </div>

          {context && contextItems.length > 1 ? (
            <div className="border-t border-zinc-200/70 bg-white/80">
              <div className="mx-auto max-w-[1600px] overflow-x-auto px-4 sm:px-6 lg:px-8">
                <nav className="flex min-w-max items-center gap-1 py-2" aria-label={`Subnavegação ${context.label}`}>
                  <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{context.label}</span>
                  {contextItems.map((item) => {
                    const active = isActive(pathname, item.href);
                    return <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-violet-100 text-violet-800" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}>{item.label}</Link>;
                  })}
                </nav>
              </div>
            </div>
          ) : null}
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
