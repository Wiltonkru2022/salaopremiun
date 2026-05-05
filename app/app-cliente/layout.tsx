import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

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
