"use client";

import { useEffect, type ReactNode } from "react";
import ProfissionalMobileAppLayout from "./ProfissionalMobileAppLayout";
import { useProfissionalMobileLayout } from "./ProfissionalMobileLayoutContext";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBottomNav?: boolean;
};

export default function ProfissionalShell({
  children,
  title,
  subtitle,
  showBottomNav = true,
}: Props) {
  const mobileLayout = useProfissionalMobileLayout();

  useEffect(() => {
    mobileLayout?.setChrome({
      title,
      subtitle,
      showBottomNav,
    });
  }, [mobileLayout, title, subtitle, showBottomNav]);

  if (mobileLayout) {
    return <>{children}</>;
  }

  return <ProfissionalMobileAppLayout>{children}</ProfissionalMobileAppLayout>;
}
