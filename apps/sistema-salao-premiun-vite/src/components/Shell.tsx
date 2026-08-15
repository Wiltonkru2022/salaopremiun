import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HandCoins,
  Home,
  LifeBuoy,
  Menu,
  Megaphone,
  Package,
  Scissors,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
  Users,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AppSession, ModuleKey } from "../types";

export const navItems: Array<{ key: ModuleKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "caixa", label: "Caixa", icon: Wallet },
  { key: "comandas", label: "Comandas", icon: ClipboardList },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "servicos", label: "Serviços", icon: Scissors },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "profissionais", label: "Profissionais", icon: UserRound },
  { key: "estoque", label: "Estoque", icon: ShoppingBag },
  { key: "comissoes", label: "Comissões", icon: HandCoins },
  { key: "vendas", label: "Vendas", icon: CreditCard },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  { key: "perfil", label: "Perfil do salão", icon: Store },
  { key: "configuracoes", label: "Configurações", icon: Settings },
  { key: "assinatura", label: "Assinatura", icon: CreditCard },
  { key: "suporte", label: "Suporte", icon: LifeBuoy }
];

export function Shell({
  session,
  page,
  onNavigate,
  onLogout,
  children
}: {
  session: AppSession;
  page: ModuleKey;
  onNavigate: (page: ModuleKey) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const salaoName = session.salao?.nome_salao || session.salao?.nome || "Salão Premiun";

  const nav = (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = page === item.key;
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              setOpen(false);
            }}
            className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-black transition ${
              active ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
          >
            <Icon size={18} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {active ? <ChevronRight size={16} /> : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-zinc-200 bg-white/88 p-4 backdrop-blur-xl xl:block">
        <Brand salaoName={salaoName} />
        <div className="mt-5 h-[calc(100vh-11rem)] overflow-auto pr-1 thin-scrollbar">{nav}</div>
        <button onClick={onLogout} className="mt-4 h-11 w-full rounded-2xl border border-zinc-200 text-sm font-black text-zinc-600">
          Sair
        </button>
      </aside>

      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/86 px-4 py-3 backdrop-blur-xl xl:ml-72">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 text-white xl:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-amber-700">Sistema Salão Premiun</div>
              <h1 className="truncate text-xl font-black tracking-[-0.05em] text-zinc-950">{navItems.find((item) => item.key === page)?.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700" aria-label="Notificações">
              <Bell size={19} />
            </button>
            <div className="hidden rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-right sm:block">
              <div className="text-xs font-black text-zinc-950">{session.usuario.nome || session.email || "Usuário"}</div>
              <div className="text-[11px] font-bold uppercase text-zinc-400">{session.usuario.nivel || "painel"}</div>
            </div>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button className="absolute inset-0 bg-zinc-950/45" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <aside className="relative h-full w-[82vw] max-w-sm overflow-auto bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <Brand salaoName={salaoName} />
              <button className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-100" onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="mt-5">{nav}</div>
          </aside>
        </div>
      ) : null}

      <main className="px-3 py-4 xl:ml-72 xl:px-5">
        {children}
      </main>
    </div>
  );
}

function Brand({ salaoName }: { salaoName: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img src="/icons/icon-192.png" alt="Salão Premiun" className="h-12 w-12 rounded-2xl" />
      <div className="min-w-0">
        <div className="truncate text-base font-black tracking-[-0.04em] text-zinc-950">{salaoName}</div>
        <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-amber-700">Painel Vite</div>
      </div>
    </div>
  );
}
