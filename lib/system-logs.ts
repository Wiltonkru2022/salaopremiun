import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
    await supabase.from("logs_sistema").insert({
      gravidade: normalizeText(params.gravidade) || "info",
      modulo: normalizeText(params.modulo) || "sistema",
      id_salao: params.idSalao || null,
      id_usuario: params.idUsuario || null,
      mensagem: normalizeText(params.mensagem) || "Evento do sistema",
      detalhes_json: sanitizeDetails(params.detalhes),
    });
  } catch (error) {
    console.error("Falha ao registrar log do sistema:", error);
  }
}
