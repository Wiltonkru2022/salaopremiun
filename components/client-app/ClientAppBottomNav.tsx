"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, Home, Search, UserRound } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";

const navItems = [
  {
    label: "Início",
    icon: Home,
    href: "/app-cliente",
    match: (pathname: string) =>
      pathname === "/app-cliente" || pathname === "/app-cliente/meuapp",
  },
  {
    href: "/app-cliente/explorar",
    label: "Explorar",
    icon: Search,
    match: (pathname: string) =>
      pathname === "/app-cliente/explorar" ||
      pathname === "/app-cliente/inicio" ||
      pathname.startsWith("/app-cliente/salao/") ||
      pathname.startsWith("/salao/"),
  },
  {
    href: "/app-cliente/agenda",
    label: "Agenda",
    icon: CalendarDays,
    match: (pathname: string) =>
      pathname.startsWith("/app-cliente/agenda") ||
      pathname.startsWith("/app-cliente/agendamentos"),
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

  const isReservationRoute =
    pathname.startsWith("/app-cliente/salao/") && pathname.includes("/reserva");
  const isDarkSalonInfoRoute =
    pathname.startsWith("/app-cliente/salao/") && pathname.includes("/detalhes");
  const isDark =
    pathname === "/app-cliente" ||
    pathname.startsWith("/app-cliente/inicio") ||
    pathname.startsWith("/app-cliente/explorar") ||
    isReservationRoute ||
    isDarkSalonInfoRoute;

  return (
    <nav
      className={`sp-mobile-fixed sp-bottom-nav fixed inset-x-0 z-40 translate-y-0 px-4 pt-2 md:hidden ${
        isDark
          ? "border-t border-white/10 bg-[#111214]/95 shadow-[0_-18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          : "border-t border-zinc-200 bg-white shadow-[0_-14px_34px_rgba(15,23,42,0.10)]"
      }`}
    >
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
                  ? isDark
                    ? "text-[#f5b83d] [&_span]:text-[#f5b83d] [&_svg]:text-[#f5b83d]"
                    : "text-[#b88918] [&_span]:text-[#b88918] [&_svg]:text-[#b88918]"
                  : isDark
                    ? "text-zinc-200 hover:text-[#f5b83d] [&_span]:text-zinc-200 [&_svg]:text-zinc-200"
                    : "text-zinc-950 hover:bg-zinc-50 [&_span]:text-zinc-950 [&_svg]:text-zinc-950"
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
