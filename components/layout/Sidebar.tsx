"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Scissors,
  UserSquare2,
  Package,
  Boxes,
  ShoppingCart,
  Wallet,
  BadgeDollarSign,
  BarChart3,
  Megaphone,
  Settings,
  CreditCard,
  LogOut,
  Receipt,
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

type Permissoes = Record<string, boolean>;

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permissionKey?: string;
  niveis?: string[];
};

type Props = {
  permissoes: Permissoes;
  nivel: string;
};

const items: SidebarItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permissionKey: "dashboard_ver",
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: CalendarDays,
    permissionKey: "agenda_ver",
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
    permissionKey: "clientes_ver",
  },
  {
    href: "/profissionais",
    label: "Profissionais",
    icon: UserSquare2,
    permissionKey: "profissionais_ver",
  },
  {
    href: "/servicos",
    label: "Serviços",
    icon: Scissors,
    permissionKey: "servicos_ver",
  },
  {
    href: "/produtos",
    label: "Produtos",
    icon: Package,
    permissionKey: "produtos_ver",
  },
  {
    href: "/estoque",
    label: "Estoque",
    icon: Boxes,
    permissionKey: "estoque_ver",
  },
  {
    href: "/comandas",
    label: "Comandas",
    icon: Receipt,
    permissionKey: "comandas_ver",
  },
  {
    href: "/vendas",
    label: "Vendas",
    icon: ShoppingCart,
    permissionKey: "vendas_ver",
  },
  {
    href: "/caixa",
    label: "Caixa",
    icon: Wallet,
    permissionKey: "caixa_ver",
  },
  {
    href: "/comissoes",
    label: "Comissões",
    icon: BadgeDollarSign,
    permissionKey: "comissoes_ver",
  },
  {
    href: "/relatorio_financeiro",
    label: "Relatórios",
    icon: BarChart3,
    permissionKey: "relatorios_ver",
  },
  {
    href: "/marketing",
    label: "Marketing",
    icon: Megaphone,
    permissionKey: "marketing_ver",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    permissionKey: "configuracoes_ver",
    niveis: ["admin"],
  },
  {
    href: "/assinatura",
    label: "Assinatura",
    icon: CreditCard,
    permissionKey: "assinatura_ver",
    niveis: ["admin"],
  },
];

export default function Sidebar({ permissoes, nivel }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nivelNormalizado = String(nivel || "").toLowerCase();

  const itemsFiltrados = items.filter((item) => {
    const permitidoPorNivel =
      !item.niveis || item.niveis.includes(nivelNormalizado);

    const permitidoPorPermissao =
      !item.permissionKey || permissoes?.[item.permissionKey] === true;

    return permitidoPorNivel && permitidoPorPermissao;
  });

  return (
    <aside className="hidden h-screen w-[290px] shrink-0 border-r border-zinc-200 bg-white xl:flex xl:flex-col">
      <div className="flex h-[132px] shrink-0 flex-col justify-center border-b border-zinc-200 px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
          SaaS Profissional
        </div>

        <div className="mt-2 text-[30px] font-black tracking-tight text-zinc-950">
          SalaoPremium
        </div>

        <p className="mt-1 text-sm text-zinc-500">Gestão premium para salão</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="scroll-premium min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-1.5">
            {itemsFiltrados.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-zinc-900 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                      : "text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition",
                      active
                        ? "bg-white/10"
                        : "bg-zinc-100 text-zinc-600 group-hover:bg-white"
                    )}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-zinc-200 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}