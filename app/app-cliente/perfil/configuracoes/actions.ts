"use server";

import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getDatabaseAdmin } from "@/lib/db/admin";

export type ToggleClienteNotificationPreferenceResult = {
  ok: boolean;
  error?: string;
};

export async function toggleClienteNotificationPreferenceAction(
  enabled: boolean
): Promise<ToggleClienteNotificationPreferenceResult> {
  const session = await requireClienteAppContext();
  const supabaseAdmin = getDatabaseAdmin();

  const { error } = await (supabaseAdmin as any)
    .from("clientes_app_auth")
    .update({
      notificacoes_ativas: Boolean(enabled),
      notificacao_app_ativa: Boolean(enabled),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.idConta);

  if (error) {
    return {
      ok: false,
      error: "Não foi possível salvar sua preferência agora.",
    };
  }

  revalidatePath("/app-cliente/perfil/configuracoes");
  return { ok: true };
}
