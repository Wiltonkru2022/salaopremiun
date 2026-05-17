"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const REFRESH_INTERVAL_MS = 1000 * 60 * 5;
const RESTORE_TOKEN_KEY = "salaopremium:cliente:restore-token";
const AUTH_ROUTES = [
  "/app-cliente/login",
  "/app-cliente/cadastro",
  "/app-cliente/recuperar-acesso",
];
const PUBLIC_ROUTES = [
  "/app-cliente",
  "/app-cliente/inicio",
  "/app-cliente/salao",
  "/app-cliente/duvidas",
  "/app-cliente/suporte",
  "/app-cliente/termos",
  "/app-cliente/privacidade",
];

export default function ClientSessionKeepAlive() {
  const pathname = usePathname();
  const lastRefreshRef = useRef(0);

  const isAuthRoute = AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const shouldRefresh = pathname.startsWith("/app-cliente") && !isAuthRoute;

  useEffect(() => {
    async function refreshSession(force = false) {
      if (!shouldRefresh) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastRefreshRef.current < REFRESH_INTERVAL_MS) {
        return;
      }

      lastRefreshRef.current = now;

      const restoreToken =
        window.localStorage.getItem(RESTORE_TOKEN_KEY) || "";
      if (isPublicRoute && !restoreToken) {
        return;
      }

      const response = await fetch("/api/app-cliente/session/refresh", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restoreToken }),
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        restoreToken?: string;
      } | null;

      if (payload?.restoreToken) {
        window.localStorage.setItem(RESTORE_TOKEN_KEY, payload.restoreToken);
      }
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
  }, [isPublicRoute, shouldRefresh]);

  return null;
}
