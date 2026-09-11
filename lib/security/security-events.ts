import { captureSystemEvent } from "@/lib/monitoring/server";
import type { SecurityTipoUsuario } from "@/lib/security/user-security";

export type SecurityEventPayload = {
  evento: string;
  tipoUsuario: SecurityTipoUsuario;
  userId?: string | null;
  idSalao?: string | null;
  risco?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detalhes?: Record<string, unknown> | null;
  origem?: string | null;
  route?: string | null;
};

function riskToSeverity(risk: string | null | undefined) {
  const normalized = String(risk || "").trim().toLowerCase();

  if (["critico", "crítico", "critical", "alto", "alta"].includes(normalized)) {
    return "critical" as const;
  }

  if (["medio", "médio", "medium", "warning", "warn"].includes(normalized)) {
    return "warning" as const;
  }

  return "info" as const;
}

export async function emitSecurityEvent(payload: SecurityEventPayload) {
  const severity = riskToSeverity(payload.risco);

  await captureSystemEvent({
    module: "security",
    eventType: payload.evento,
    severity,
    message: payload.evento,
    idSalao: payload.idSalao || null,
    idUsuario: payload.userId || null,
    route: payload.route || null,
    origin: "server",
    details: {
      tipoUsuario: payload.tipoUsuario,
      risco: payload.risco || null,
      ip: payload.ip || null,
      userAgent: payload.userAgent || null,
      origemOriginal: payload.origem || "salaopremium-next",
      ...((payload.detalhes as Record<string, unknown>) || {}),
    },
    success: severity !== "critical",
    createIncident: severity === "critical",
  });

  return { ok: true, provider: "supabase" as const };
}
