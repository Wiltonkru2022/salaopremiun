"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Menu, Search, UserRound, X } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";

const navItems = [
  {
    label: "Inicio",
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

export default function ClientAppDrawerNav({
  isDark = false,
  floating = false,
}: {
  isDark?: boolean;
  floating?: boolean;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const activeLabel = useMemo(
    () => navItems.find((item) => item.match(pathname))?.label || "Menu",
    [pathname]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className={
          floating
            ? `sp-mobile-fixed fixed right-4 top-[calc(env(safe-area-inset-top)+0.85rem)] z-[70] flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl md:hidden ${
                isDark
                  ? "border-white/15 bg-white/10 text-white"
                  : "border-zinc-200 bg-white/95 text-zinc-950"
              }`
            : `flex h-11 w-11 items-center justify-center rounded-full border transition md:hidden ${
                isDark
                  ? "border-white/15 bg-black/45 text-white backdrop-blur"
                  : "border-zinc-200 bg-zinc-50 text-zinc-950 hover:bg-zinc-100"
              }`
        }
      >
        <Menu size={24} />
      </button>

      {mounted && open
        ? createPortal(
        <div className="fixed inset-0 z-[999] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 h-full w-full bg-black/45"
            onClick={() => setOpen(false)}
          />

          <aside className="relative z-10 flex h-full w-[min(20rem,84vw)] flex-col bg-white px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] text-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  Salao Premium
                </p>
                <p className="mt-1 truncate text-xl font-black tracking-[-0.04em]">
                  {activeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-950"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="mt-5 flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);

                return (
                  <ClientAppPendingLink
                    key={item.href}
                    href={item.href}
                    icon={Icon}
                    iconSize={22}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-base font-black transition ${
                      active
                        ? "bg-zinc-950 text-white [&_span]:text-white [&_svg]:text-white"
                        : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 [&_span]:text-zinc-700 [&_svg]:text-zinc-700"
                    }`}
                  >
                    {item.label}
                  </ClientAppPendingLink>
                );
              })}
            </nav>
          </aside>
        </div>,
        document.body
        )
        : null}
    </>
  );
}
