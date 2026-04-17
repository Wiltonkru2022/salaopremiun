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
  title: "SalaoPremium",
  description: "Sistema SaaS para saloes",
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
