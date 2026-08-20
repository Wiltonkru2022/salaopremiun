"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureClientError, setClientMonitoringContext } from "@/lib/monitoring/client";
import { classifyClientRuntimeError } from "@/lib/monitoring/client-error-classifier";

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

function isResourceErrorTarget(target: EventTarget | null) {
  return target instanceof HTMLScriptElement || target instanceof HTMLLinkElement;
}

export default function MonitoringClient() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    setClientMonitoringContext({
      route: pathname,
      screen: pathname,
      surface: inferSurface(pathname),
    });

    // Page views foram desligadas aqui para proteger o plano free do Supabase.
    // A camada de monitoramento continua registrando falhas, lentidão e alertas reais.
  }, [pathname]);

  useEffect(() => {
    function handleWindowError(event: ErrorEvent) {
      // Erros de <script>/<link> sao tratados pelo runtime de assets para evitar duplicidade.
      if (isResourceErrorTarget(event.target)) return;

      const classification = classifyClientRuntimeError({
        error: event.error,
        message: event.message,
      });

      void captureClientError({
        module: inferModule(pathname),
        action: "window_error",
        route: pathname,
        screen: pathname,
        error: event.error || new Error(event.message || "Erro de janela"),
        fallbackMessage: event.message || "Erro inesperado de interface.",
        errorCode: classification.code,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          runtimeCategory: classification.category,
        },
        useBeacon: true,
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason || "Promise rejeitada"));
      const classification = classifyClientRuntimeError({ error });

      void captureClientError({
        module: inferModule(pathname),
        action: "unhandled_rejection",
        route: pathname,
        screen: pathname,
        error,
        errorCode: classification.code,
        fallbackMessage: "Falha não tratada na interface.",
        details: {
          reason: error.message,
          runtimeCategory: classification.category,
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
