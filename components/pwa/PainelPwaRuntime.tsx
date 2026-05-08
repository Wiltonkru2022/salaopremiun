"use client";

import { useEffect } from "react";

export default function PainelPwaRuntime() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // A instalacao do app e opcional; falha no service worker nao deve travar o painel.
    });
  }, []);

  return null;
}
