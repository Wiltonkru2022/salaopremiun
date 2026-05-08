import type { Metadata } from "next";
import MonitoringClient from "@/components/monitoring/MonitoringClient";
import RouteDocumentTitle from "@/components/layout/RouteDocumentTitle";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  title: {
    default: "SalaoPremium",
    template: "%s | SalãoPremium",
  },
  description:
    "Gestao premium para salões: agenda, caixa, comandas, profissionais, estoque, comissões e assinatura em um SaaS multi-tenant.",
  applicationName: "SalaoPremium",
  openGraph: {
    title: "SalaoPremium",
    description:
      "Gestao premium para salões com agenda, caixa, comandas, estoque, comissões e assinatura.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "SalaoPremium",
    description:
      "Gestao premium para salões com operação, financeiro e assinatura no mesmo sistema.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon-preview.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <RouteDocumentTitle />
        <MonitoringClient />
        {children}
      </body>
    </html>
  );
}
