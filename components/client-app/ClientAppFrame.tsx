"use client";

import { useEffect, type ReactNode } from "react";
import { useClientMobileLayout } from "@/components/client-app/ClientMobileLayoutContext";
import PartnerAdSlot from "@/components/parcerias/PartnerAdSlot";

function ClientFrameContent({ children }: { children: ReactNode }) {
  return (
    <>
      <PartnerAdSlot
        publico="cliente"
        local="app_cliente"
        allowedPaths={["/app-cliente", "/app-cliente/inicio"]}
        className="mx-4 mb-4 md:mx-6"
      />
      {children}
    </>
  );
}

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

  return <ClientFrameContent>{children}</ClientFrameContent>;
}
