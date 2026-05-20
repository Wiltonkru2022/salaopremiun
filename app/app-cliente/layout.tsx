import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import ClientInstallOnboardingGate from "@/components/client-app/ClientInstallOnboardingGate";
import ClientMobileAppLayout from "@/components/client-app/ClientMobileAppLayout";
import ClientSessionKeepAlive from "@/components/client-app/ClientSessionKeepAlive";
import MobileViewportRuntime from "@/components/pwa/MobileViewportRuntime";

export const metadata: Metadata = {
  title: "App Cliente",
  description:
    "Agende horários, acompanhe visitas e avalie atendimentos no app cliente do SalãoPremium.",
  manifest: "/app-cliente/manifest.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    title: "App Cliente",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  maximumScale: 1,
};

export default function AppClienteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <ClientInstallOnboardingGate />
      </Suspense>
      <MobileViewportRuntime />
      <ClientSessionKeepAlive />
      <ClientMobileAppLayout>{children}</ClientMobileAppLayout>
    </>
  );
}
