"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Store, UserRound } from "lucide-react";

const navItems = [
  {
    href: "/app-cliente/inicio",
    label: "Saloes",
    icon: Store,
    match: (pathname: string) =>
      pathname === "/app-cliente/inicio" || pathname.startsWith("/app-cliente/salao/"),
  },
  {
    href: "/app-cliente/agendamentos",
    label: "Agenda",
    icon: CalendarDays,
    match: (pathname: string) => pathname.startsWith("/app-cliente/agendamentos"),
  },
  {
    href: "/app-cliente/perfil",
    label: "Perfil",
    icon: UserRound,
    match: (pathname: string) => pathname.startsWith("/app-cliente/perfil"),
  },
];

const hiddenRoutes = [
  "/app-cliente/login",
  "/app-cliente/cadastro",
  "/app-cliente/recuperar-acesso",
];

export default function ClientAppBottomNav() {
  const pathname = usePathname();

  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-18px_48px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition ${
                active
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon size={19} strokeWidth={2.4} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
