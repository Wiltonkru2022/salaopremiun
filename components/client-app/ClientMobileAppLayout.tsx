"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";
import ClientAppBottomNav from "@/components/client-app/ClientAppBottomNav";
import PushPermissionRuntime from "@/components/push/PushPermissionRuntime";
import {
  ClientMobileLayoutContext,
  type ClientMobileChromeState,
} from "@/components/client-app/ClientMobileLayoutContext";

const HIDDEN_CHROME_ROUTES = [
  "/app-cliente/login",
  "/app-cliente/cadastro",
  "/app-cliente/recuperar-acesso",
  "/app-cliente/onboarding",
];

const CUSTOM_HEADER_ROUTES = [
  "/app-cliente",
  "/app-cliente/inicio",
  "/app-cliente/explorar",
  "/app-cliente/salao",
  "/app-cliente/agenda",
  "/app-cliente/agendamentos",
  "/app-cliente/perfil",
];

export default function ClientMobileAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [chrome, setChrome] = useState<ClientMobileChromeState>({
    title: "SalaoPremium",
    subtitle: "Seu app de agendamentos.",
  });
  const contextValue = useMemo(() => ({ setChrome }), []);
  const hideChrome = HIDDEN_CHROME_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const hasCustomHeader = CUSTOM_HEADER_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isReservationRoute =
    pathname.startsWith("/app-cliente/salao/") && pathname.includes("/reserva");
  const isDarkSalonInfoRoute =
    pathname.startsWith("/app-cliente/salao/") && pathname.includes("/detalhes");
  const isDarkRoute =
    pathname === "/app-cliente" ||
    pathname.startsWith("/app-cliente/inicio") ||
    pathname.startsWith("/app-cliente/explorar") ||
    isReservationRoute ||
    isDarkSalonInfoRoute;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.backgroundColor;
    const previousBody = body.style.backgroundColor;
    const nextColor = isDarkRoute ? "#050505" : "#ffffff";

    html.style.backgroundColor = nextColor;
    body.style.backgroundColor = nextColor;

    return () => {
      html.style.backgroundColor = previousHtml;
      body.style.backgroundColor = previousBody;
    };
  }, [isDarkRoute]);

  if (hideChrome) {
    return (
      <div className="app-cliente-root min-h-dvh bg-[#f7f7f5] text-zinc-900">
        {children}
      </div>
    );
  }

  return (
    <ClientMobileLayoutContext.Provider value={contextValue}>
      <div
        className={`app-cliente-root min-h-dvh overflow-x-hidden ${
          isDarkRoute ? "bg-[#050505] text-white" : "bg-white text-zinc-950"
        }`}
      >
        <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col pb-24 md:pb-4">
          {!hasCustomHeader ? (
          <header className="sp-mobile-fixed fixed inset-x-0 top-0 z-50 mx-auto flex max-w-6xl items-center justify-between gap-2 border-b border-zinc-100 bg-white/95 px-3 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:gap-3 sm:px-4 md:top-3 md:rounded-[1.5rem] md:border md:pt-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800 sm:tracking-[0.14em]">
                <Sparkles size={12} />
                <span className="truncate">Salao Premium Cliente</span>
              </div>
              <h1 className="mt-2 max-w-full truncate text-[1.22rem] font-black tracking-[-0.04em] sm:text-[1.35rem] md:text-[1.55rem]">
                {chrome.title}
              </h1>
              <p className="mt-1 max-w-full truncate text-xs leading-5 text-zinc-500 sm:text-sm">
                {chrome.subtitle}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <PushPermissionRuntime audience="cliente_app" compact />
              <nav className="hidden flex-wrap items-center gap-2 text-sm font-semibold text-zinc-700 md:flex">
                <ClientAppPendingLink
                  href="/app-cliente/explorar"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
                >
                  Saloes
                </ClientAppPendingLink>
                <ClientAppPendingLink
                  href="/app-cliente/agenda"
                  pendingLabel="Abrindo"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
                >
                  Agendamentos
                </ClientAppPendingLink>
                <ClientAppPendingLink
                  href="/app-cliente/perfil"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
                >
                  Perfil
                </ClientAppPendingLink>
              </nav>
            </div>
          </header>
          ) : null}

          <main
            className={`flex-1 pb-4 ${
              hasCustomHeader
                ? "pt-0"
                : "pt-[calc(env(safe-area-inset-top)+7.75rem)] md:pt-[8.75rem]"
            }`}
          >
            {children}
          </main>

          <div className="h-2" />
        </div>
        <ClientAppBottomNav />
      </div>
    </ClientMobileLayoutContext.Provider>
  );
}
