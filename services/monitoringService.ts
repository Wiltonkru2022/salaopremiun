import { createClient } from "@/lib/db/server";
import { getPainelUserContextByAuthUserId } from "@/lib/auth/get-painel-user-context";
import { getAdminMasterUserContextByAuthUserId } from "@/lib/admin-master/auth/get-admin-master-user-context.server";
import { classifyOperationalError } from "@/lib/monitoring/error-catalog";
import { observeOperationalFailure } from "@/lib/monitoring/operational-observer.server";
import {
  captureSystemEvent,
  captureSystemMetric,
} from "@/lib/monitoring/server";
import type { MonitoringPayload } from "@/lib/monitoring/types";

export type MonitoringRoutePayload = MonitoringPayload & {
  kind?: "event" | "error" | "metric";
};

export class MonitoringServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "MonitoringServiceError";
  }
}

export function createMonitoringService() {
  return {
    async resolveMonitoringIdentity() {
      try {
        const database = await createClient();
        const {
          data: { user },
        } = await database.auth.getUser();

        if (!user) {
          return {
            idSalao: null,
            idUsuario: null,
            idAdminUsuario: null,
          };
        }

        const usuario = await getPainelUserContextByAuthUserId(user.id);
        const [adminResult, usuarioResult] = await Promise.all([
          getAdminMasterUserContextByAuthUserId(user.id),
          Promise.resolve(
            usuario
              ? {
                  id: usuario.id,
                  id_salao: usuario.id_salao,
                }
              : null
          ),
        ]);

        return {
          idSalao: usuarioResult?.id_salao || null,
          idUsuario: usuarioResult?.id || null,
          idAdminUsuario: adminResult?.id || null,
        };
      } catch {
        return {
          idSalao: null,
          idUsuario: null,
          idAdminUsuario: null,
        };
      }
    },

    async captureMetric(payload: MonitoringPayload) {
      await captureSystemMetric({
        ...payload,
        metric: String(payload.details?.metric || payload.action || "metric"),
        value: Number(payload.details?.value || 0),
        unit: String(payload.details?.unit || ""),
      });
    },

    async captureError(payload: MonitoringPayload) {
      const message = payload.message || "Erro de cliente";
      const rule = classifyOperationalError({
        message,
        errorCode: payload.errorCode,
        module: payload.module,
        route: payload.route,
        action: payload.action,
        origin: payload.origin,
      });

      await captureSystemEvent({
        ...payload,
        eventType: payload.eventType || "error",
        severity: payload.severity || (rule.opensIncident ? "error" : "warning"),
        message,
        errorCode: rule.code,
        success: false,
        isUserError: !rule.opensIncident,
        createIncident: false,
      });

      if (rule.opensIncident) {
        await observeOperationalFailure({
          message,
          errorCode: rule.code,
          module: payload.module,
          action: payload.action,
          route: payload.route,
          origin: payload.origin,
          stack: payload.stack,
          details: payload.details,
        });
      }
    },

    async captureEvent(payload: MonitoringPayload) {
      const isFailure =
        payload.success === false ||
        payload.severity === "error" ||
        payload.severity === "critical";

      if (!isFailure) {
        await captureSystemEvent(payload);
        return;
      }

      const rule = classifyOperationalError({
        message: payload.message,
        errorCode: payload.errorCode,
        module: payload.module,
        route: payload.route,
        action: payload.action,
        origin: payload.origin,
      });

      await captureSystemEvent({
        ...payload,
        errorCode: rule.code,
        isUserError: !rule.opensIncident,
        createIncident: false,
      });

      if (rule.opensIncident) {
        await observeOperationalFailure({
          message: payload.message || "Falha operacional",
          errorCode: rule.code,
          module: payload.module,
          action: payload.action,
          route: payload.route,
          origin: payload.origin,
          stack: payload.stack,
          details: payload.details,
        });
      }
    },

    async reportRouteFailure(error: unknown) {
      try {
        await observeOperationalFailure({
          message:
            error instanceof Error
              ? error.message
              : "Erro ao processar evento de monitoramento.",
          module: "monitoring_event_route",
          action: "capture_event",
          route: "/api/monitoring/event",
          origin: "api",
          stack: error instanceof Error ? error.stack : null,
          componentKey: "admin.health",
          details: { method: "POST" },
        });
      } catch (incidentError) {
        console.error("Falha ao registrar incidente de monitoring:", incidentError);
      }
    },
  };
}

export type MonitoringService = ReturnType<typeof createMonitoringService>;
