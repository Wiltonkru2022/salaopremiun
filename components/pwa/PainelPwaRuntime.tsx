"use client";

import { useEffect } from "react";
import PushPermissionRuntime from "@/components/push/PushPermissionRuntime";

export default function PainelPwaRuntime() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // A instalacao do app e opcional; falha no service worker nao deve travar o painel.
    });
  }, []);

  return (
    <div className="sp-painel-pwa-fab fixed bottom-4 right-4 z-[420] rounded-full shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
      <PushPermissionRuntime audience="salao_painel" compact />
    </div>
  );
}
