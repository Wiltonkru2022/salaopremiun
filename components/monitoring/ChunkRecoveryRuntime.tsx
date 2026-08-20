"use client";

import { useEffect } from "react";
import { captureClientEvent } from "@/lib/monitoring/client";
import {
  classifyClientRuntimeError,
  classifyStaticResourceFailure,
} from "@/lib/monitoring/client-error-classifier";

const RECOVERY_KEY = "salaopremium:chunk-recovery:last-reload";
const RECOVERY_WINDOW_MS = 60_000;

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

    if (now - lastReload < RECOVERY_WINDOW_MS) return false;

    window.sessionStorage.setItem(RECOVERY_KEY, String(now));
    return true;
  } catch {
    return true;
  }
}

export default function ChunkRecoveryRuntime() {
  useEffect(() => {
    async function recover(
      code: "chunk_load_failed" | "stale_service_worker" | "asset_version_mismatch",
      reason: string,
      details: Record<string, unknown>
    ) {
      void captureClientEvent({
        module: "app",
        action: "asset_recovery_detected",
        eventType: "asset_recovery",
        severity: "warning",
        errorCode: code,
        message: "Falha real de asset detectada; recuperacao segura iniciada.",
        details: { reason, ...details },
        success: true,
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
      const classification = classifyStaticResourceFailure(source);
      if (!classification?.recoverAsset) return;

      void recover("chunk_load_failed", "resource_error", {
        source,
        tagName: target instanceof Element ? target.tagName : null,
      });
    }

    function handleWindowError(event: ErrorEvent) {
      const classification = classifyClientRuntimeError({
        error: event.error,
        message: event.message,
      });
      if (!classification.recoverAsset) return;

      void recover(
        classification.code as "chunk_load_failed" | "stale_service_worker" | "asset_version_mismatch",
        "window_error",
        {
          filename: event.filename,
          message: event.message,
        }
      );
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const classification = classifyClientRuntimeError({ error: event.reason });
      if (!classification.recoverAsset) return;

      void recover(
        classification.code as "chunk_load_failed" | "stale_service_worker" | "asset_version_mismatch",
        "unhandled_rejection",
        {
          reason:
            event.reason instanceof Error
              ? event.reason.message
              : String(event.reason || ""),
        }
      );
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
