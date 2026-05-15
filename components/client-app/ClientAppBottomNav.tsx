"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, Heart, Search, UserRound } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";

const navItems = [
  {
    label: "Meu app",
    icon: Heart,
    href: "/app-cliente",
    match: (pathname: string) => pathname === "/app-cliente",
  },
  {
    href: "/app-cliente/inicio",
    label: "Explorar",
    icon: Search,
    match: (pathname: string) =>
      pathname === "/app-cliente/inicio" ||
      pathname.startsWith("/app-cliente/salao/") ||
      pathname.startsWith("/salao/"),
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
  "/app-cliente/onboarding",
];

export default function ClientAppBottomNav() {
  const pathname = usePathname();

  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav className="sp-mobile-fixed fixed inset-x-0 bottom-0 z-40 translate-y-0 border-t border-zinc-200 bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-2 shadow-[0_-14px_34px_rgba(15,23,42,0.10)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);

          return (
            <ClientAppPendingLink
              key={item.label}
              href={item.href}
              icon={Icon}
              iconSize={20}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                active
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              {item.label}
            </ClientAppPendingLink>
          );
        })}
      </div>
    </nav>
  );
}
