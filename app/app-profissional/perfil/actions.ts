"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProfissionalNotificationPreferenceKey =
  | "notificacoes_ativas"
  | "notificacao_app_ativa"
  | "notificacao_email_ativa";

const VALID_NOTIFICATION_KEYS: ProfissionalNotificationPreferenceKey[] = [
  "notificacoes_ativas",
  "notificacao_app_ativa",
  "notificacao_email_ativa",
];

export async function toggleProfissionalNotificationPreferenceAction(
  key: ProfissionalNotificationPreferenceKey,
  enabled: boolean
) {
  if (!VALID_NOTIFICATION_KEYS.includes(key)) {
    return { ok: false, error: "Preferência inválida." };
  }

  const session = await requireProfissionalAppContext();
  const patch: Partial<Record<ProfissionalNotificationPreferenceKey, boolean>> =
    {
      [key]: enabled,
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

  const { error } = await (getSupabaseAdmin() as any)
    .from("profissionais")
    .update(patch)
    .eq("id", session.idProfissional)
    .eq("id_salao", session.idSalao);

  if (error) {
    return {
      ok: false,
      error: "Não foi possível salvar a preferência agora.",
    };
  }

  revalidatePath("/app-profissional/perfil");
  return { ok: true };
}

export async function sairProfissionalAction() {
  await clearProfissionalSession();
  redirect("/app-profissional/login");
}
