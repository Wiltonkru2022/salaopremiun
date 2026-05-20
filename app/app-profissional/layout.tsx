import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import ProfissionalMobileAppLayout from "@/components/profissional/layout/ProfissionalMobileAppLayout";
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
    <>
      <Suspense fallback={null}>
        <ProfissionalInstallOnboardingGate />
      </Suspense>
      <ProfissionalMobileAppLayout>{children}</ProfissionalMobileAppLayout>
    </>
  );
}
