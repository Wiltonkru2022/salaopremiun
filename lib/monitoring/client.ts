"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import type {
  MonitoringActorType,
  MonitoringOrigin,
  MonitoringPayload,
  MonitoringSurface,
} from "@/lib/monitoring/types";

type ClientMonitoringContext = {
  actorType?: MonitoringActorType;
  surface?: MonitoringSurface;
  idSalao?: string | null;
  idUsuario?: string | null;
  idAdminUsuario?: string | null;
  route?: string | null;
  screen?: string | null;
};

type ClientMonitoringEventParams = MonitoringPayload & {
  useBeacon?: boolean;
};

let monitoringContext: ClientMonitoringContext = {
  actorType: "anonimo",
  surface: "unknown",
};

const LOW_SIGNAL_EVENT_TTL_MS = 5 * 60 * 1000;

function isLowSignalEvent(payload: Record<string, unknown>) {
  const severity = String(payload.severity || "info").toLowerCase();
  const eventType = String(payload.eventType || "").toLowerCase();
  return (
    (severity === "info" || severity === "debug") &&
    ["page_view", "ui_event", "action_started", "action_succeeded"].includes(eventType)
  );
}

function buildLowSignalCacheKey(payload: Record<string, unknown>) {
  return [
    "salaopremium:monitoring",
    String(payload.eventType || ""),
    String(payload.module || ""),
    String(payload.action || ""),
    String(payload.route || ""),
    String(payload.screen || ""),
    String(payload.entity || ""),
    String(payload.entityId || ""),
  ].join(":");
}

function shouldSkipLowSignalEvent(payload: Record<string, unknown>) {
  if (typeof window === "undefined" || !isLowSignalEvent(payload)) {
    return false;
  }

  try {
    const key = buildLowSignalCacheKey(payload);
    const lastSentAt = Number(window.sessionStorage.getItem(key) || "0");
    const now = Date.now();

    if (now - lastSentAt < LOW_SIGNAL_EVENT_TTL_MS) {
      return true;
    }

    window.sessionStorage.setItem(key, String(now));
  } catch {
    return false;
  }

  return false;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function getBrowserName() {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent || null;
}

function getDeviceName() {
  if (typeof navigator === "undefined") return null;
  return navigator.platform || "web";
}

function buildPayload(kind: "event" | "error" | "metric", params: ClientMonitoringEventParams) {
  return {
    kind,
    module: normalizeText(params.module) || "ui",
    eventType: normalizeText(params.eventType) || kind,
    severity: params.severity || (kind === "error" ? "error" : "info"),
    message: normalizeText(params.message) || "Evento de interface",
    action: normalizeText(params.action) || null,
    entity: normalizeText(params.entity) || null,
    entityId: normalizeText(params.entityId) || null,
    origin: (params.origin || "client") as MonitoringOrigin,
    surface: params.surface || monitoringContext.surface || "unknown",
    actorType: params.actorType || monitoringContext.actorType || "anonimo",
    idSalao: params.idSalao || monitoringContext.idSalao || null,
    idUsuario: params.idUsuario || monitoringContext.idUsuario || null,
    idAdminUsuario: params.idAdminUsuario || monitoringContext.idAdminUsuario || null,
    route: params.route || monitoringContext.route || null,
    screen: params.screen || monitoringContext.screen || null,
    details: params.details || {},
    responseMs: params.responseMs ?? null,
    success: params.success ?? null,
    isUserError: params.isUserError ?? null,
    errorCode: normalizeText(params.errorCode) || null,
    stack: params.stack || null,
    browser: params.browser || getBrowserName(),
    device: params.device || getDeviceName(),
  };
}

function postMonitoringPayload(
  payload: Record<string, unknown>,
  useBeacon = false
) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (shouldSkipLowSignalEvent(payload)) {
    return Promise.resolve();
  }

  const body = JSON.stringify(payload);

  if (useBeacon && "sendBeacon" in navigator) {
    navigator.sendBeacon(
      "/api/monitoring/event",
      new Blob([body], { type: "application/json" })
    );
    return Promise.resolve();
  }

  return fetch("/api/monitoring/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: useBeacon,
    cache: "no-store",
  }).catch(() => undefined);
}

export function setClientMonitoringContext(next: ClientMonitoringContext) {
  monitoringContext = {
    ...monitoringContext,
    ...next,
  };
}

export function getClientMonitoringContext() {
  return { ...monitoringContext };
}

export function captureClientEvent(params: ClientMonitoringEventParams) {
  return postMonitoringPayload(buildPayload("event", params), Boolean(params.useBeacon));
}

export function captureClientMetric(params: ClientMonitoringEventParams) {
  return postMonitoringPayload(buildPayload("metric", params), Boolean(params.useBeacon));
}

export function captureClientError(
  params: Omit<ClientMonitoringEventParams, "message"> & {
    error: unknown;
    fallbackMessage?: string;
  }
) {
  const message = getErrorMessage(
    params.error,
    params.fallbackMessage || "Erro inesperado na interface."
  );

  return postMonitoringPayload(
    buildPayload("error", {
      ...params,
      message,
      stack:
        params.error instanceof Error ? params.error.stack || params.stack || null : params.stack || null,
      severity: params.severity || "error",
      success: false,
    }),
    Boolean(params.useBeacon)
  );
}

export async function monitorClientOperation<T>(
  params: Omit<ClientMonitoringEventParams, "message" | "responseMs" | "success"> & {
    startMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    emitLifecycleEvents?: boolean;
  },
  operation: () => Promise<T>
) {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  if (params.emitLifecycleEvents && params.startMessage) {
    void captureClientEvent({
      ...params,
      eventType: "action_started",
      message: params.startMessage,
      success: true,
    });
  }

  try {
    const result = await operation();
    const finishedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    if (params.emitLifecycleEvents) {
      void captureClientEvent({
        ...params,
        eventType: "action_succeeded",
        message:
          params.successMessage ||
          `${normalizeText(params.module)} executou ${normalizeText(params.action)} com sucesso`,
        responseMs: finishedAt - startedAt,
        success: true,
      });
    }

    return result;
  } catch (error) {
    const finishedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    void captureClientError({
      ...params,
      eventType: "action_failed",
      error,
      fallbackMessage:
        params.errorMessage ||
        `${normalizeText(params.module)} falhou em ${normalizeText(params.action)}`,
      responseMs: finishedAt - startedAt,
      success: false,
    });
    throw error;
  }
}
