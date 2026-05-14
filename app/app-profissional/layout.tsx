import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import ProfissionalInstallOnboardingGate from "@/components/profissional/pwa/ProfissionalInstallOnboardingGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App Profissional",
  description: "Agenda, clientes, comandas e comissões para profissionais do salão.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppProfissionalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="app-profissional-root min-h-dvh bg-[#f5f5f5] text-zinc-900">
      <Suspense fallback={null}>
        <ProfissionalInstallOnboardingGate />
      </Suspense>
      {children}
    </div>
  );
}
