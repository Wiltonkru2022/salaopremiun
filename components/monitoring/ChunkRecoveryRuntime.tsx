"use client";

import { useEffect } from "react";
import { captureClientError, captureClientEvent } from "@/lib/monitoring/client";

const RECOVERY_KEY = "salaopremium:chunk-recovery:last-reload";
const RECOVERY_WINDOW_MS = 60_000;

function isChunkUrl(value: unknown) {
  const text = String(value || "");
  return text.includes("/_next/static/chunks/") || text.includes("/_next/static/");
}

function isChunkError(value: unknown) {
  if (!value) return false;

  const message =
    value instanceof Error
      ? `${value.name} ${value.message} ${value.stack || ""}`
      : String(value);

  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /failed to load chunk/i.test(message) ||
    isChunkUrl(message)
  );
}

async function refreshBrowserRuntime() {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }
  } catch {
    // A recuperacao por reload continua mesmo se o service worker nao responder.
  }

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((key) => /next|salaopremium|workbox|static/i.test(key))
          .map((key) => window.caches.delete(key))
      );
    }
  } catch {
    // Cache Storage pode estar indisponivel em alguns navegadores.
  }
}

function shouldReloadOnce() {
  try {
    const now = Date.now();
    const lastReload = Number(window.sessionStorage.getItem(RECOVERY_KEY) || "0");

    if (now - lastReload < RECOVERY_WINDOW_MS) {
      return false;
    }

    window.sessionStorage.setItem(RECOVERY_KEY, String(now));
    return true;
  } catch {
    return true;
  }
}

export default function ChunkRecoveryRuntime() {
  useEffect(() => {
    async function recover(reason: string, details: Record<string, unknown>) {
      void captureClientEvent({
        module: "app",
        action: "chunk_recovery_detected",
        eventType: "chunk_load_failed",
        severity: "warning",
        message: "Falha ao carregar arquivos atualizados da aplicacao.",
        details,
        useBeacon: true,
      });

      if (!shouldReloadOnce()) return;

      await refreshBrowserRuntime();
      window.location.reload();
    }

    function handleResourceError(event: Event) {
      const target = event.target;
      const source =
        target instanceof HTMLScriptElement
          ? target.src
          : target instanceof HTMLLinkElement
            ? target.href
            : "";

      if (!isChunkUrl(source)) return;

      void recover("resource_error", {
        source,
        tagName: target instanceof Element ? target.tagName : null,
      });
    }

    function handleWindowError(event: ErrorEvent) {
      if (!isChunkError(event.error || event.message || event.filename)) return;

      void captureClientError({
        module: "app",
        action: "chunk_window_error",
        eventType: "chunk_load_failed",
        error: event.error || new Error(event.message || "Falha ao carregar chunk."),
        fallbackMessage: "Falha ao carregar arquivos atualizados da aplicacao.",
        details: {
          filename: event.filename,
          message: event.message,
        },
        useBeacon: true,
      });

      void recover("window_error", {
        filename: event.filename,
        message: event.message,
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isChunkError(event.reason)) return;

      void recover("unhandled_rejection", {
        reason:
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason || ""),
      });
    }

    window.addEventListener("error", handleResourceError, true);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleResourceError, true);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
