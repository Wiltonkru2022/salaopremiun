"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Menu, Receipt, Scissors, User2, Users, X } from "lucide-react";

const items = [
  { href: "/app-profissional/inicio", label: "Inicio", icon: Home, key: "inicio" },
  { href: "/app-profissional/clientes", label: "Clientes", icon: Users, key: "clientes" },
  { href: "/app-profissional/agenda", label: "Agenda", icon: CalendarDays, key: "agenda" },
  { href: "/app-profissional/servicos", label: "Servicos", icon: Scissors, key: "servicos" },
  { href: "/app-profissional/comandas", label: "Comandas", icon: Receipt, key: "comandas" },
  { href: "/app-profissional/perfil", label: "Perfil", icon: User2, key: "perfil" },
] as const;

function getSectionKey(pathname: string | null) {
  const value = String(pathname || "").split("?")[0];

  if (!value || value === "/" || value === "/app-profissional") {
    return "inicio";
  }

  const segments = value.split("/").filter(Boolean);

  if (segments[0] === "app-profissional") {
    return segments[1] || "inicio";
  }

  return segments[0] || "inicio";
}

export default function ProfissionalDrawerNav() {
  const pathname = usePathname();
  const currentSection = useMemo(() => getSectionKey(pathname), [pathname]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-950 transition active:bg-zinc-100"
      >
        <Menu size={24} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
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
                  Profissional
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
              {items.map(({ href, label, icon: Icon, key }) => {
                const active = currentSection === key;

                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-base font-black transition ${
                      active
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-50 text-zinc-700 active:bg-zinc-100"
                    }`}
                  >
                    <Icon size={22} strokeWidth={2.2} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
