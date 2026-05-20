"use client";

import { useEffect, type ReactNode } from "react";
import ClientMobileAppLayout from "@/components/client-app/ClientMobileAppLayout";
import { useClientMobileLayout } from "@/components/client-app/ClientMobileLayoutContext";

export default function ClientAppFrame({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  const mobileLayout = useClientMobileLayout();

  useEffect(() => {
    mobileLayout?.setChrome({ title, subtitle });
  }, [mobileLayout, title, subtitle]);

  if (mobileLayout) {
    return <>{children}</>;
  }

  return <ClientMobileAppLayout>{children}</ClientMobileAppLayout>;
}
