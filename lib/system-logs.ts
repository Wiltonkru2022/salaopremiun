import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { captureSystemEvent } from "@/lib/monitoring/server";

type LogSeverity = "info" | "warning" | "error";

type RegistrarLogParams = {
  gravidade?: LogSeverity;
  modulo: string;
  idSalao?: string | null;
  idUsuario?: string | null;
  mensagem: string;
  detalhes?: Record<string, unknown>;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function sanitizeDetails(value?: Record<string, unknown>) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value).slice(0, 40);
  return Object.fromEntries(entries);
}

export async function registrarLogSistema(params: RegistrarLogParams) {
  try {
    const supabase = getSupabaseAdmin();
    const details = sanitizeDetails(params.detalhes);
    const gravidade = normalizeText(params.gravidade) || "info";
    const modulo = normalizeText(params.modulo) || "sistema";
    const mensagem = normalizeText(params.mensagem) || "Evento do sistema";

    await supabase.from("logs_sistema").insert({
      gravidade,
      modulo,
      id_salao: params.idSalao || null,
      id_usuario: params.idUsuario || null,
      mensagem,
      detalhes_json: details,
    });

    await captureSystemEvent({
      module: modulo,
      eventType: "ui_event",
      severity:
        gravidade === "warning"
          ? "warning"
          : gravidade === "error"
            ? "error"
            : "info",
      message: mensagem,
      idSalao: params.idSalao || null,
      idUsuario: params.idUsuario || null,
      details,
      origin: "server",
      createIncident: gravidade === "error",
    });
  } catch (error) {
    console.error("Falha ao registrar log do sistema:", error);
  }
}
