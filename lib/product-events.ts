import type {
  ClientFunnelEvent,
  ProfessionalProductivityEvent,
} from "@/core/shared/contracts";
import { captureClientEvent, captureClientMetric } from "@/lib/monitoring/client";

type EventBase = {
  idSalao?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
  route?: string | null;
  screen?: string | null;
};

export function trackClientFunnel(
  event: ClientFunnelEvent,
  params: EventBase = {}
) {
  return captureClientEvent({
    module: "cliente_app",
    eventType: "funnel",
    action: event,
    message: `Funil do cliente: ${event}`,
    entity: "cliente_funnel",
    severity: "info",
    surface: "public",
    ...params,
  });
}

export function trackProfessionalProductivity(
  event: ProfessionalProductivityEvent,
  params: EventBase = {}
) {
  return captureClientEvent({
    module: "app_profissional",
    eventType: "productivity",
    action: event,
    message: `Produtividade profissional: ${event}`,
    entity: "professional_productivity",
    severity: "info",
    surface: "app_profissional",
    actorType: "profissional",
    ...params,
  });
}

export function trackDuration(
  action: string,
  responseMs: number,
  params: EventBase & { module: "cliente_app" | "app_profissional" }
) {
  return captureClientMetric({
    ...params,
    module: params.module,
    eventType: "duration",
    action,
    message: `Duração da operação: ${action}`,
    entity: params.module === "cliente_app" ? "cliente_funnel" : "professional_productivity",
    severity: "info",
    surface: params.module === "cliente_app" ? "public" : "app_profissional",
    responseMs,
    success: true,
  });
}
