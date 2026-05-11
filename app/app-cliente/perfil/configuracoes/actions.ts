"use server";

import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ClienteNotificationPreferenceKey =
  | "notificacoes_ativas"
  | "notificacao_app_ativa"
  | "notificacao_email_ativa";

const ALLOWED_KEYS = new Set<ClienteNotificationPreferenceKey>([
  "notificacoes_ativas",
  "notificacao_app_ativa",
  "notificacao_email_ativa",
]);

export type ToggleClienteNotificationPreferenceResult = {
  ok: boolean;
  error?: string;
};

export async function toggleClienteNotificationPreferenceAction(
  key: ClienteNotificationPreferenceKey,
  enabled: boolean
): Promise<ToggleClienteNotificationPreferenceResult> {
  const session = await requireClienteAppContext();

  if (!ALLOWED_KEYS.has(key)) {
    return { ok: false, error: "Preferencia invalida." };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const patch: Record<string, boolean | string> = {
    [key]: Boolean(enabled),
    updated_at: new Date().toISOString(),
  };

  if (key === "notificacoes_ativas" && !enabled) {
    patch.notificacao_app_ativa = false;
    patch.notificacao_email_ativa = false;
  }

  if (
    (key === "notificacao_app_ativa" || key === "notificacao_email_ativa") &&
    enabled
  ) {
    patch.notificacoes_ativas = true;
  }

  const { error } = await (supabaseAdmin as any)
    .from("clientes_app_auth")
    .update(patch)
    .eq("id", session.idConta);

  if (error) {
    return {
      ok: false,
      error: "Não foi possível salvar sua preferencia agora.",
    };
  }

  revalidatePath("/app-cliente/perfil/configuracoes");
  return { ok: true };
}
