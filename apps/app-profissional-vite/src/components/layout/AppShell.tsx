import { Bell, CalendarDays, HelpCircle, Home, Menu, Scissors, Settings, Star, User2, Users, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";

export type View =
  | "inicio"
  | "agenda"
  | "clientes"
  | "servicos"
  | "comandas"
  | "comissao"
  | "avaliacoes"
  | "notificacoes"
  | "perfil"
  | "configuracoes"
  | "suporte"
  | "duvidas"
  | "instalar"
  | "privacidade";

const nav = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "servicos", label: "Servicos", icon: Scissors },
  { id: "comandas", label: "Comandas", icon: WalletCards },
  { id: "comissao", label: "Comissao", icon: WalletCards },
  { id: "avaliacoes", label: "Avaliacoes", icon: Star },
  { id: "notificacoes", label: "Avisos", icon: Bell },
  { id: "perfil", label: "Perfil", icon: User2 },
  { id: "configuracoes", label: "Configuracoes", icon: Settings },
  { id: "suporte", label: "Suporte", icon: HelpCircle }
] as const;

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/app-profissional/icons/icon-192.png" alt="Salão Premiun" className="h-11 w-11 rounded-2xl shadow-sm" />
      {!compact ? (
        <div className="min-w-0">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-amber-700">Salão Premiun</div>
          <div className="truncate text-lg font-black tracking-[-0.04em] text-zinc-950">Profissional</div>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ view, setView, title, subtitle, children }: { view: View; setView: (view: View) => void; title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profissional, logout } = useAuth();

  const menu = (
    <aside className="flex h-full w-[19rem] max-w-[82vw] flex-col bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BrandLogo />
          <div className="mt-1 text-sm font-bold text-zinc-500">{profissional?.nome}</div>
        </div>
        <button className="grid h-11 w-11 place-items-center rounded-full bg-zinc-100" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X size={22} />
        </button>
      </div>

      <nav className="mt-8 grid gap-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setOpen(false);
              }}
              className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-black ${active ? "bg-zinc-950 text-white" : "text-zinc-700 active:bg-zinc-100"}`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <Button className="mt-auto" variant="secondary" onClick={logout}>
        Sair
      </Button>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <div className="hidden min-h-screen border-r border-zinc-200 bg-white md:block">{menu}</div>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <BrandLogo compact />
                <div className="min-w-0">
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-amber-700">Salão Premiun</div>
                  <h1 className="mt-1 truncate text-3xl font-black tracking-[-0.05em] text-zinc-950">{title}</h1>
                  {subtitle ? <p className="mt-0.5 truncate text-sm font-bold text-zinc-500">{subtitle}</p> : null}
                </div>
              </div>
              <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white shadow-sm md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
                <Menu size={24} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-4 py-4 safe-bottom">{children}</div>
        </main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <div className="relative z-10">{menu}</div>
        </div>
      ) : null}
    </div>
  );
}
