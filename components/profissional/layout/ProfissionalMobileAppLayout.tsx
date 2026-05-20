"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";
import ProfissionalInstallPrompt from "@/components/profissional/pwa/ProfissionalInstallPrompt";
import ProfissionalPwaRuntime from "@/components/profissional/pwa/ProfissionalPwaRuntime";
import ProfissionalNavigationRuntime from "./ProfissionalNavigationRuntime";
import ProfissionalHeader from "./ProfissionalHeader";
import ProfissionalBottomNav from "./ProfissionalBottomNav";
import {
  ProfissionalMobileLayoutContext,
  type ProfissionalMobileChromeState,
} from "./ProfissionalMobileLayoutContext";

const HIDDEN_CHROME_ROUTES = [
  "/app-profissional/login",
  "/app-profissional/recuperar-senha",
  "/app-profissional/onboarding",
];

export default function ProfissionalMobileAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [chrome, setChrome] = useState<ProfissionalMobileChromeState>({
    title: "SalaoPremium",
    subtitle: "",
    showBottomNav: true,
  });
  const hideChrome = HIDDEN_CHROME_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const contextValue = useMemo(() => ({ setChrome }), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (hideChrome) {
    return (
      <div className="app-profissional-root min-h-dvh bg-[#f5f5f5] text-zinc-900">
        {children}
      </div>
    );
  }

  return (
    <ProfissionalMobileLayoutContext.Provider value={contextValue}>
      <div
        className="app-profissional-root min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,#fff7df_0,#f5f5f5_36%,#eceff3_100%)] text-zinc-900"
        suppressHydrationWarning
      >
        {mounted ? (
          <>
            <MonitoringContextBridge
              actorType="profissional"
              surface="app_profissional"
            />
            <ProfissionalPwaRuntime />
            <ProfissionalNavigationRuntime />
          </>
        ) : null}

        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-hidden bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)] sm:max-w-lg lg:max-w-2xl">
          <ProfissionalHeader title={chrome.title} subtitle={chrome.subtitle} />

          <main className="min-w-0 overflow-x-hidden flex-1 px-3 pb-28 pt-[8.25rem] sm:px-4 sm:pt-[8.75rem]">
            {mounted ? <ProfissionalInstallPrompt /> : null}
            {children}
          </main>

          {mounted && chrome.showBottomNav ? <ProfissionalBottomNav /> : null}
        </div>
      </div>
    </ProfissionalMobileLayoutContext.Provider>
  );
}
