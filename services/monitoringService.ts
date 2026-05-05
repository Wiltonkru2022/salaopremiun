import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPainelUserContextByAuthUserId } from "@/lib/auth/get-painel-user-context";
import { getAdminMasterUserContextByAuthUserId } from "@/lib/admin-master/auth/get-admin-master-user-context.server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  captureSystemError,
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
        const supabase = await createClient();
        const supabaseAdmin = getSupabaseAdmin();
        const {
          data: { user },
        } = await supabase.auth.getUser();

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
      await captureSystemError({
        ...payload,
        error: new Error(payload.message || "Erro de cliente"),
        stack: payload.stack || null,
      });
    },

    async captureEvent(payload: MonitoringPayload) {
      await captureSystemEvent(payload);
    },

    async reportRouteFailure(error: unknown) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: "api:monitoring:event:erro",
          module: "monitoring_event_route",
          title: "Rota de monitoramento falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro ao processar evento de monitoramento.",
          severity: "alta",
          details: {
            route: "/api/monitoring/event",
            method: "POST",
          },
        });
      } catch (incidentError) {
        console.error("Falha ao registrar incidente de monitoring:", incidentError);
      }
    },
  };
}

export type MonitoringService = ReturnType<typeof createMonitoringService>;
