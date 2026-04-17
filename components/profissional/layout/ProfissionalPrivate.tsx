import type { ReactNode } from "react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalSession } from "@/lib/profissional-auth.server";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBottomNav?: boolean;
};

export default async function ProfissionalPrivate({
  children,
  title,
  subtitle,
  showBottomNav,
}: Props) {
  await requireProfissionalSession();

  return (
    <ProfissionalShell
      title={title}
      subtitle={subtitle}
      showBottomNav={showBottomNav}
    >
      {children}
    </ProfissionalShell>
  );
}
