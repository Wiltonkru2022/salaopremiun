import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import {
  captureSystemError,
  captureSystemEvent,
  captureSystemMetric,
} from "@/lib/monitoring/server";
import type { MonitoringPayload } from "@/lib/monitoring/types";

type MonitoringRoutePayload = MonitoringPayload & {
  kind?: "event" | "error" | "metric";
};

async function resolveMonitoringIdentity() {
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
      idSalao: (usuarioResult.data as { id_salao?: string | null } | null)?.id_salao || null,
      idUsuario: (usuarioResult.data as { id?: string | null } | null)?.id || null,
      idAdminUsuario: (adminResult.data as { id?: string | null } | null)?.id || null,
    };
  } catch {
    return {
      idSalao: null,
      idUsuario: null,
      idAdminUsuario: null,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as MonitoringRoutePayload;
    const identity = await resolveMonitoringIdentity();
    const payload = {
      ...body,
      idSalao: identity.idSalao || body.idSalao || null,
      idUsuario: identity.idUsuario || body.idUsuario || null,
      idAdminUsuario: identity.idAdminUsuario || body.idAdminUsuario || null,
    };

    if (body.kind === "metric") {
      await captureSystemMetric({
        ...payload,
        metric: String(body.details?.metric || body.action || "metric"),
        value: Number(body.details?.value || 0),
        unit: String(body.details?.unit || ""),
      });
    } else if (body.kind === "error") {
      await captureSystemError({
        ...payload,
        error: new Error(body.message || "Erro de cliente"),
        stack: body.stack || null,
      });
    } else {
      await captureSystemEvent({
        ...payload,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
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

    return NextResponse.json({ ok: true });
  }
}
