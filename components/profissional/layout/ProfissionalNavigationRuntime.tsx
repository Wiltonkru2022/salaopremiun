"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const PREFETCH_ROUTES = [
  "/app-profissional/inicio",
  "/app-profissional/clientes",
  "/app-profissional/clientes/novo",
  "/app-profissional/agenda",
  "/app-profissional/agenda/novo",
  "/app-profissional/comandas",
  "/app-profissional/comandas/nova",
  "/app-profissional/comissao",
  "/app-profissional/perfil",
  "/app-profissional/suporte",
];

function buildLabel(pathname: string) {
  if (pathname.includes("/agenda")) return "Abrindo agenda...";
  if (pathname.includes("/clientes")) return "Abrindo clientes...";
  if (pathname.includes("/comandas")) return "Abrindo comandas...";
  if (pathname.includes("/comissao")) return "Abrindo comissao...";
  if (pathname.includes("/perfil")) return "Abrindo perfil...";
  if (pathname.includes("/suporte")) return "Abrindo suporte...";
  if (pathname.includes("/inicio")) return "Abrindo inicio...";
  return "Carregando tela...";
}

function isInternalProfissionalHref(value: string | null) {
  if (!value) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      return url.pathname.startsWith("/app-profissional");
    } catch {
      return false;
    }
  }
  return value.startsWith("/app-profissional");
}

function getNormalizedPath(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value).pathname + new URL(value).search;
  }
  return value;
}

export default function ProfissionalNavigationRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    PREFETCH_ROUTES.forEach((href) => {
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      router.prefetch(href);
    });
  }, [router]);

  useEffect(() => {
    if (!pendingPath) return;

    const normalizedPending = pendingPath.split("?")[0];

    if (pathname === normalizedPending || pathname.startsWith(`${normalizedPending}/`)) {
      setPendingPath(null);
    }
  }, [pathname, pendingPath]);

  useEffect(() => {
    function clearTimer() {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function scheduleReset() {
      clearTimer();
      timeoutRef.current = window.setTimeout(() => {
        setPendingPath(null);
      }, 15000);
    }

    function handleIntent(event: Event) {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target) return;

      const href = target.getAttribute("href");
      if (!isInternalProfissionalHref(href)) return;

      const normalized = getNormalizedPath(String(href));
      if (prefetchedRef.current.has(normalized)) return;

      prefetchedRef.current.add(normalized);
      router.prefetch(normalized);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target) return;

      const href = target.getAttribute("href");
      if (!isInternalProfissionalHref(href)) return;

      const normalized = getNormalizedPath(String(href));
      const nextPathname = normalized.split("?")[0];

      if (nextPathname === pathname) return;

      setPendingPath(nextPathname);
      scheduleReset();
    }

    document.addEventListener("mouseover", handleIntent, true);
    document.addEventListener("touchstart", handleIntent, true);
    document.addEventListener("focusin", handleIntent, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      clearTimer();
      document.removeEventListener("mouseover", handleIntent, true);
      document.removeEventListener("touchstart", handleIntent, true);
      document.removeEventListener("focusin", handleIntent, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, router]);

  const visible = Boolean(pendingPath);

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 origin-left bg-[linear-gradient(90deg,#c89b3c_0%,#f5d98e_45%,#c89b3c_100%)] shadow-[0_0_16px_rgba(200,155,60,0.45)] transition-transform duration-300 ${
          visible ? "scale-x-100" : "scale-x-0"
        }`}
      />

      <div
        className={`pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[81] -translate-x-1/2 transition-all duration-200 ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <LoaderCircle size={14} className="animate-spin text-[#b07b19]" />
          {buildLabel(pendingPath || "")}
        </div>
      </div>
    </>
  );
}
