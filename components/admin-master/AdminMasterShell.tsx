import Link from "next/link";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  CreditCard,
  Flag,
  Headphones,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";
import type { AdminMasterPermissions } from "@/lib/admin-master/auth/adminMasterPermissions";

type Props = {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
  perfil: string;
  permissions: AdminMasterPermissions;
};

const menu = [
  { href: "/admin-master", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin-master/saloes", label: "Saloes", icon: Building2 },
  { href: "/admin-master/assinaturas", label: "Assinaturas", icon: CreditCard },
  { href: "/admin-master/assinaturas/cobrancas", label: "Cobrancas", icon: Wallet },
  { href: "/admin-master/financeiro", label: "Financeiro", icon: ChartNoAxesCombined },
  { href: "/admin-master/operacao", label: "Operacao", icon: Activity },
  { href: "/admin-master/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin-master/logs", label: "Logs", icon: Boxes },
  { href: "/admin-master/suporte", label: "Suporte", icon: Headphones },
  { href: "/admin-master/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin-master/notificacoes", label: "Notificacoes", icon: Bell },
  { href: "/admin-master/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/admin-master/alertas", label: "Alertas", icon: ShieldCheck },
  { href: "/admin-master/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin-master/planos", label: "Planos", icon: Flag },
  { href: "/admin-master/recursos", label: "Recursos", icon: Boxes },
  { href: "/admin-master/feature-flags", label: "Flags", icon: Flag },
  { href: "/admin-master/configuracoes-globais", label: "Globais", icon: Settings },
  { href: "/admin-master/usuarios-admin", label: "Admins", icon: Users },
  { href: "/admin-master/checklists", label: "Checklists", icon: ShieldCheck },
  { href: "/admin-master/relatorios", label: "Relatorios", icon: ChartNoAxesCombined },
];

export default function AdminMasterShell({
  children,
  adminName,
  adminEmail,
  perfil,
}: Props) {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-zinc-950">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-zinc-200 bg-zinc-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
            SalaoPremium
          </div>
          <div className="mt-2 font-display text-2xl font-bold">AdminMaster</div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
            Centro de comando do SaaS, assinaturas, suporte e operacao.
          </div>
        </div>

        <nav className="scroll-premium flex-1 space-y-1 overflow-y-auto p-4">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-3xl bg-white p-4 text-zinc-950">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Admin logado
            </div>
            <div className="mt-2 text-sm font-bold">{adminName}</div>
            <div className="truncate text-xs text-zinc-500">{adminEmail}</div>
            <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {perfil}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#f7f5ef]/90 px-5 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Painel interno
              </div>
              <h1 className="font-display text-2xl font-bold text-zinc-950">
                AdminMaster
              </h1>
            </div>

            <div className="hidden flex-1 justify-center md:flex">
              <div className="w-full max-w-xl rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-500 shadow-sm">
                Busca global: salao, email, cobranca, ticket ou webhook
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin-master/alertas"
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
              >
                Alertas
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white"
              >
                Ver painel
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
