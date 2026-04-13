"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Receipt,
  User2,
  Users,
} from "lucide-react";

const items = [
  { href: "/app-profissional/inicio", label: "Início", icon: Home },
  { href: "/app-profissional/clientes", label: "Clientes", icon: Users },
  { href: "/app-profissional/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app-profissional/comandas", label: "Comandas", icon: Receipt },
  { href: "/app-profissional/perfil", label: "Perfil", icon: User2 },
];

export default function ProfissionalBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-3 text-[11px] ${
                active ? "text-[#c89b3c]" : "text-zinc-500"
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