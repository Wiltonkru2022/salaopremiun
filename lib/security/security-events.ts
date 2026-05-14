import { sendOracleVpsSecurityEvent } from "@/lib/oracle-vps/client";
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

  if (["critico", "critical", "alto", "alta"].includes(normalized)) {
    return "critical";
  }

  if (["medio", "médio", "medium", "warning", "warn"].includes(normalized)) {
    return "warning";
  }

  if (["baixo", "low"].includes(normalized)) {
    return "info";
  }

  return "info";
}

export async function emitSecurityEvent(payload: SecurityEventPayload) {
  const resposta = await sendOracleVpsSecurityEvent({
    type: "security_event",
    severity: riskToSeverity(payload.risco),
    module: "security",
    eventType: payload.evento,
    route: payload.route || null,
    source: payload.origem || "salaopremium-next",
    idSalao: payload.idSalao || null,
    idUsuario: payload.userId || null,
    userId: payload.userId || null,
    tipoUsuario: payload.tipoUsuario,
    details: {
      ip: payload.ip || null,
      userAgent: payload.userAgent || null,
      ...((payload.detalhes as Record<string, unknown>) || {}),
    },
    message: payload.evento,
  });

  return resposta;
}
