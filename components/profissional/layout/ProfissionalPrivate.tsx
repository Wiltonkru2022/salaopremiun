import type { ReactNode } from "react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";
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
  const context = await requireProfissionalAppContext();
  const notifications = await listProfissionalAppNotifications(context).catch(
    () => []
  );

  return (
    <ProfissionalShell
      title={title}
      subtitle={subtitle}
      showBottomNav={showBottomNav}
      notifications={notifications}
    >
      {children}
    </ProfissionalShell>
  );
}
