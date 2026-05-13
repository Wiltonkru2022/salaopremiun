import type { ReactNode } from "react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

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
  await requireProfissionalAppContext();

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
