import type { Metadata } from "next";
import ChunkRecoveryRuntime from "@/components/monitoring/ChunkRecoveryRuntime";
import MonitoringClient from "@/components/monitoring/MonitoringClient";
import RouteDocumentTitle from "@/components/layout/RouteDocumentTitle";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : new URL("https://salaopremiun.com.br"),
  title: {
    default: "SalãoPremium",
    template: "%s | SalãoPremium",
  },
  description:
    "Gestão premium para salões: agenda, caixa, comandas, profissionais, estoque, comissões e assinatura em um SaaS multi-tenant.",
  applicationName: "SalãoPremium",
  alternates: {
    canonical: "https://salaopremiun.com.br",
  },
  openGraph: {
    title: "SalãoPremium",
    description:
      "Gestão premium para salões com agenda, caixa, comandas, estoque, comissões e assinatura.",
    url: "https://salaopremiun.com.br",
    siteName: "SalãoPremium",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Logo SalãoPremium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SalãoPremium",
    description:
      "Gestão premium para salões com operação, financeiro e assinatura no mesmo sistema.",
    images: ["/logo.png"],
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
        <ChunkRecoveryRuntime />
        <MonitoringClient />
        {children}
      </body>
    </html>
  );
}
