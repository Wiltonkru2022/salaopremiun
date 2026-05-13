"use client";

import { useEffect, useState, type ReactNode } from "react";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";
import ProfissionalInstallPrompt from "@/components/profissional/pwa/ProfissionalInstallPrompt";
import ProfissionalPwaRuntime from "@/components/profissional/pwa/ProfissionalPwaRuntime";
import ProfissionalNavigationRuntime from "./ProfissionalNavigationRuntime";
import ProfissionalHeader from "./ProfissionalHeader";
import ProfissionalBottomNav from "./ProfissionalBottomNav";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBottomNav?: boolean;
};

export default function ProfissionalShell({
  children,
  title,
  subtitle,
  showBottomNav = true,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,#fff7df_0,#f5f5f5_36%,#eceff3_100%)]"
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
        <ProfissionalHeader title={title} subtitle={subtitle} />
        {mounted ? <ProfissionalInstallPrompt /> : null}

        <main className="min-w-0 overflow-x-hidden flex-1 px-3 pb-28 pt-[8.25rem] sm:px-4 sm:pt-[8.75rem]">
          {children}
        </main>

        {mounted && showBottomNav ? <ProfissionalBottomNav /> : null}
      </div>
    </div>
  );
}
