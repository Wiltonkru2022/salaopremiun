import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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

        const [usuarioResult, adminResult] = await Promise.all([
          supabaseAdmin
            .from("usuarios")
            .select("id, id_salao")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
          supabaseAdmin
            .from("admin_master_usuarios")
            .select("id")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
        ]);

        return {
          idSalao:
            (usuarioResult.data as { id_salao?: string | null } | null)
              ?.id_salao || null,
          idUsuario:
            (usuarioResult.data as { id?: string | null } | null)?.id || null,
          idAdminUsuario:
            (adminResult.data as { id?: string | null } | null)?.id || null,
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
