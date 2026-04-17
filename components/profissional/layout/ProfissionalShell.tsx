"use client";

import type { ReactNode } from "react";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBottomNav?: boolean;
};

import ProfissionalHeader from "./ProfissionalHeader";
import ProfissionalBottomNav from "./ProfissionalBottomNav";

export default function ProfissionalShell({
  children,
  title,
  subtitle,
  showBottomNav = true,
}: Props) {
  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <MonitoringContextBridge
        actorType="profissional"
        surface="app_profissional"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f5f5f5]">
        <ProfissionalHeader title={title} subtitle={subtitle} />

        <main className="flex-1 px-4 pb-24 pt-4">
          {children}
        </main>

        {showBottomNav ? <ProfissionalBottomNav /> : null}
      </div>
    </div>
  );
}
