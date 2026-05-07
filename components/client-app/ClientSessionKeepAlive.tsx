"use client";

import { useEffect, useRef } from "react";

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 6;

export default function ClientSessionKeepAlive() {
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    async function refreshSession(force = false) {
      const now = Date.now();
      if (!force && now - lastRefreshRef.current < REFRESH_INTERVAL_MS) {
        return;
      }

      lastRefreshRef.current = now;

      await fetch("/api/app-cliente/session/refresh", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);
    }

    void refreshSession(true);

    const intervalId = window.setInterval(() => {
      void refreshSession();
    }, REFRESH_INTERVAL_MS);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return null;
}
