"use client";

import { useEffect, useState, type ReactNode } from "react";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";
import ProfissionalInstallPrompt from "@/components/profissional/pwa/ProfissionalInstallPrompt";
import ProfissionalPwaRuntime from "@/components/profissional/pwa/ProfissionalPwaRuntime";
import type { ProfissionalAppNotification } from "@/lib/profissional-app-notification-contracts";
import ProfissionalNavigationRuntime from "./ProfissionalNavigationRuntime";
import ProfissionalAlerts from "./ProfissionalAlerts";
import ProfissionalHeader from "./ProfissionalHeader";
import ProfissionalBottomNav from "./ProfissionalBottomNav";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBottomNav?: boolean;
  notifications?: ProfissionalAppNotification[];
};

export default function ProfissionalShell({
  children,
  title,
  subtitle,
  showBottomNav = true,
  notifications = [],
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
        {mounted ? <ProfissionalAlerts notifications={notifications} /> : null}

        <main className="min-w-0 overflow-x-hidden flex-1 px-3 pb-28 pt-3 sm:px-4 sm:pt-4">
          {children}
        </main>

        {mounted && showBottomNav ? <ProfissionalBottomNav /> : null}
      </div>
    </div>
  );
}
