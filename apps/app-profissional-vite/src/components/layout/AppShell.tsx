import {
  Bell,
  CalendarDays,
  HelpCircle,
  Home,
  Menu,
  Scissors,
  Settings,
  Star,
  TicketPercent,
  User2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";
import { ptBR } from "../../../../../core/i18n/pt-BR";

export type View =
  | "inicio"
  | "agenda"
  | "clientes"
  | "servicos"
  | "comandas"
  | "cupons"
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
  { id: "inicio", label: ptBR.professional.home, icon: Home },
  { id: "agenda", label: ptBR.professional.agenda, icon: CalendarDays },
  { id: "clientes", label: ptBR.professional.clients, icon: Users },
  { id: "servicos", label: ptBR.professional.services, icon: Scissors },
  { id: "comandas", label: ptBR.professional.tickets, icon: WalletCards },
  { id: "cupons", label: "Cupons", icon: TicketPercent },
  { id: "comissao", label: ptBR.professional.commission, icon: WalletCards },
  { id: "avaliacoes", label: ptBR.professional.reviews, icon: Star },
  { id: "notificacoes", label: ptBR.professional.alerts, icon: Bell },
  { id: "perfil", label: ptBR.professional.profile, icon: User2 },
  { id: "configuracoes", label: ptBR.professional.settings, icon: Settings },
  { id: "suporte", label: ptBR.professional.support, icon: HelpCircle },
] as const;

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/app-profissional/icons/icon-192.png"
        alt="Salão Premium"
        className="h-11 w-11 rounded-2xl shadow-sm"
      />
      {!compact ? (
        <div className="min-w-0">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-amber-700">
            Salão Premium
          </div>
          <div className="truncate text-lg font-black tracking-[-0.04em] text-zinc-950">
            Profissional
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UnreadBadge({ count, dark = false }: { count: number; dark?: boolean }) {
  if (!count) return null;
  return (
    <span
      className={`absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black leading-none ${
        dark
          ? "border-zinc-950 bg-[#f5bd42] text-black"
          : "border-white bg-[#f5bd42] text-black"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AppShell({
  view,
  setView,
  title,
  subtitle,
  unreadNotifications,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  title: string;
  subtitle: string;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { profissional, logout } = useAuth();

  const menu = (
    <aside className="flex h-full w-[19rem] max-w-[82vw] flex-col bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BrandLogo />
          <div className="mt-1 text-sm font-bold text-zinc-500">{profissional?.nome}</div>
        </div>
        <button
          className="grid h-11 w-11 place-items-center rounded-full bg-zinc-100"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="mt-8 grid gap-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          const notificationItem = item.id === "notificacoes";
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setOpen(false);
              }}
              className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-black ${
                active ? "bg-zinc-950 text-white" : "text-zinc-700 active:bg-zinc-100"
              }`}
            >
              <span className="relative grid h-6 w-6 place-items-center">
                <Icon size={20} />
                {notificationItem ? (
                  <UnreadBadge count={unreadNotifications} dark={active} />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {notificationItem && unreadNotifications > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                    active ? "bg-white/15 text-white" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
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
        <div className="hidden min-h-screen border-r border-zinc-200 bg-white md:block">
          {menu}
        </div>
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <BrandLogo compact />
                <div className="min-w-0">
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-amber-700">
                    Salão Premium
                  </div>
                  <h1 className="mt-1 truncate text-3xl font-black tracking-[-0.05em] text-zinc-950">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-0.5 truncate text-sm font-bold text-zinc-500">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("notificacoes")}
                  className={`relative grid h-12 w-12 place-items-center rounded-full border shadow-sm transition active:scale-95 ${
                    view === "notificacoes"
                      ? "border-zinc-950 bg-zinc-950 text-[#f5bd42]"
                      : "border-zinc-200 bg-white text-zinc-900"
                  }`}
                  aria-label={
                    unreadNotifications
                      ? `Notificações, ${unreadNotifications} não lidas`
                      : "Notificações"
                  }
                >
                  <Bell size={23} />
                  <UnreadBadge
                    count={unreadNotifications}
                    dark={view === "notificacoes"}
                  />
                </button>

                <button
                  className="grid h-12 w-12 place-items-center rounded-full border border-zinc-200 bg-white shadow-sm md:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="Abrir menu"
                >
                  <Menu size={24} />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-4 py-4 safe-bottom">{children}</div>
        </main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="relative z-10">{menu}</div>
        </div>
      ) : null}
    </div>
  );
}
