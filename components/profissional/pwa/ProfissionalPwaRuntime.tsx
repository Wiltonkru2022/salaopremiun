"use client";

import { useEffect } from "react";
import MobileViewportRuntime from "@/components/pwa/MobileViewportRuntime";

export default function ProfissionalPwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Instalar o app continua opcional; falha de SW nao deve travar o fluxo.
    });
  }, []);

  return <MobileViewportRuntime />;
}
