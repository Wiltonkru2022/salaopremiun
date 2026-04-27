import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AppProfissionalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f5f5f5] text-zinc-900">
      {children}
    </div>
  );
}
