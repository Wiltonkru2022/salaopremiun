import type {
  ProfessionalProductivityEvent,
} from "../types/contracts";

export function trackProfessionalProductivity(
  event: ProfessionalProductivityEvent,
  params: {
    idSalao?: string | null;
    entityId?: string | null;
    details?: Record<string, unknown>;
  } = {}
) {
  if (typeof window === "undefined") return;

  void fetch("/api/monitoring/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      kind: "event",
      module: "app_profissional",
      eventType: "productivity",
      action: event,
      message: `Produtividade profissional: ${event}`,
      entity: "professional_productivity",
      entityId: params.entityId || null,
      idSalao: params.idSalao || null,
      actorType: "profissional",
      surface: "app_profissional",
      origin: "client",
      severity: "info",
      details: params.details || {},
    }),
  }).catch(() => undefined);
}

export function trackProfessionalDuration(
  action: string,
  responseMs: number,
  params: { idSalao?: string | null; entityId?: string | null } = {}
) {
  if (typeof window === "undefined") return;

  void fetch("/api/monitoring/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      kind: "metric",
      module: "app_profissional",
      eventType: "duration",
      action,
      message: `Duração da operação: ${action}`,
      entity: "professional_productivity",
      entityId: params.entityId || null,
      idSalao: params.idSalao || null,
      actorType: "profissional",
      surface: "app_profissional",
      origin: "client",
      severity: "info",
      responseMs,
      success: true,
    }),
  }).catch(() => undefined);
}
