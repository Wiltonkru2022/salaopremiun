"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Receipt, User2, Users } from "lucide-react";

const items = [
  { href: "/app-profissional/inicio", label: "Inicio", icon: Home },
  { href: "/app-profissional/clientes", label: "Clientes", icon: Users },
  { href: "/app-profissional/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app-profissional/comandas", label: "Comandas", icon: Receipt },
  { href: "/app-profissional/perfil", label: "Perfil", icon: User2 },
];

export default function ProfissionalBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`my-2 flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold ${
                active
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "text-zinc-500 active:bg-zinc-100"
              }`}
            >
              <Icon size={18} strokeWidth={2.2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
