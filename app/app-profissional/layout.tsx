import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App Profissional",
  description: "Agenda, clientes, comandas e comissoes para profissionais do salao.",
};

export default function AppProfissionalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="app-profissional-root min-h-dvh bg-[#f5f5f5] text-zinc-900">
      {children}
    </div>
  );
}
