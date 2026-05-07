"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 6;
const PROTECTED_ROUTES = [
  "/app-cliente/agendamentos",
  "/app-cliente/perfil",
];

export default function ClientSessionKeepAlive() {
  const pathname = usePathname();
  const router = useRouter();
  const lastRefreshRef = useRef(0);
  const redirectedRef = useRef(false);

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  useEffect(() => {
    async function refreshSession(force = false) {
      if (!isProtectedRoute || redirectedRef.current) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastRefreshRef.current < REFRESH_INTERVAL_MS) {
        return;
      }

      lastRefreshRef.current = now;

      const response = await fetch("/api/app-cliente/session/refresh", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);

      if (response?.status === 401) {
        redirectedRef.current = true;
        const next = pathname || "/app-cliente/inicio";
        const destino = `/app-cliente/login?next=${encodeURIComponent(next)}`;
        router.replace(`/app-cliente/logout?destino=${encodeURIComponent(destino)}`);
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
  }, [isProtectedRoute, pathname, router]);

  return null;
}
