"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  captureClientError,
  captureClientEvent,
  setClientMonitoringContext,
} from "@/lib/monitoring/client";

function inferSurface(pathname: string) {
  if (pathname.startsWith("/admin-master")) return "admin_master";
  if (pathname.startsWith("/app-profissional")) return "app_profissional";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/caixa") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/comandas") ||
    pathname.startsWith("/comissoes") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/estoque") ||
    pathname.startsWith("/marketing") ||
    pathname.startsWith("/meu-plano") ||
    pathname.startsWith("/perfil-salao") ||
    pathname.startsWith("/produtos") ||
    pathname.startsWith("/profissionais") ||
    pathname.startsWith("/relatorio-financeiro") ||
    pathname.startsWith("/servicos") ||
    pathname.startsWith("/servicos-extras") ||
    pathname.startsWith("/suporte") ||
    pathname.startsWith("/vendas")
  ) {
    return "painel";
  }

  return "public";
}

function inferModule(pathname: string) {
  const sanitized = pathname.split("?")[0];
  const segments = sanitized.split("/").filter(Boolean);

  if (!segments.length) return "site";
  if (segments[0] === "admin-master") return segments[1] || "admin_master";
  if (segments[0] === "app-profissional") return segments[1] || "app_profissional";
  return segments[0];
}

export default function MonitoringClient() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    setClientMonitoringContext({
      route: pathname,
      screen: pathname,
      surface: inferSurface(pathname),
    });

    void captureClientEvent({
      module: inferModule(pathname),
      eventType: "page_view",
      message: `Visualizacao de ${pathname}`,
      action: "page_view",
      route: pathname,
      screen: pathname,
      surface: inferSurface(pathname),
      useBeacon: true,
    });
  }, [pathname]);

  useEffect(() => {
    function handleWindowError(event: ErrorEvent) {
      void captureClientError({
        module: inferModule(pathname),
        action: "window_error",
        route: pathname,
        screen: pathname,
        error: event.error || new Error(event.message || "Erro de janela"),
        fallbackMessage: event.message || "Erro inesperado de interface.",
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        useBeacon: true,
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      void captureClientError({
        module: inferModule(pathname),
        action: "unhandled_rejection",
        route: pathname,
        screen: pathname,
        error:
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason || "Promise rejeitada")),
        fallbackMessage: "Falha nao tratada na interface.",
        details: {
          reason:
            event.reason instanceof Error
              ? event.reason.message
              : String(event.reason || ""),
        },
        useBeacon: true,
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [pathname]);

  return null;
}
