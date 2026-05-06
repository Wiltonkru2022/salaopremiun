import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "SalaoPremium Cliente",
  description:
    "Agende horarios, acompanhe visitas e avalie atendimentos no app cliente do SalaoPremium.",
  manifest: "/app-cliente/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SalaoPremium Cliente",
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
    <div className="app-cliente-root min-h-dvh bg-[#f7f7f5] text-zinc-900">
      {children}
    </div>
  );
}
