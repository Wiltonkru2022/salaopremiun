import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import MonitoringClient from "@/components/monitoring/MonitoringClient";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  title: {
    default: "SalaoPremium",
    template: "%s | SalaoPremium",
  },
  description:
    "Gestao premium para saloes: agenda, caixa, comandas, profissionais, estoque, comissoes e assinatura em um SaaS multi-tenant.",
  applicationName: "SalaoPremium",
  openGraph: {
    title: "SalaoPremium",
    description:
      "Gestao premium para saloes com agenda, caixa, comandas, estoque, comissoes e assinatura.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "SalaoPremium",
    description:
      "Gestao premium para saloes com operacao, financeiro e assinatura no mesmo sistema.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <MonitoringClient />
        {children}
      </body>
    </html>
  );
}
