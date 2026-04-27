"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Receipt, User2, Users } from "lucide-react";

const items = [
  { href: "/app-profissional/inicio", label: "Inicio", icon: Home, key: "inicio" },
  { href: "/app-profissional/clientes", label: "Clientes", icon: Users, key: "clientes" },
  { href: "/app-profissional/agenda", label: "Agenda", icon: CalendarDays, key: "agenda" },
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

export default function ProfissionalBottomNav() {
  const pathname = usePathname();
  const currentSection = useMemo(() => getSectionKey(pathname), [pathname]);
  const [pressedSection, setPressedSection] = useState<string | null>(null);

  useEffect(() => {
    setPressedSection(null);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 overflow-x-hidden border-t border-white/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 sm:max-w-lg lg:max-w-2xl">
        {items.map(({ href, label, icon: Icon, key }) => {
          const active = pressedSection ? pressedSection === key : currentSection === key;

          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? "page" : undefined}
              onClick={() => setPressedSection(key)}
              className={`my-2 flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition sm:px-2 sm:text-[11px] ${
                active
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "text-zinc-500 active:bg-zinc-100"
              }`}
            >
              <Icon size={18} strokeWidth={2.2} />
              <span className="truncate leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
