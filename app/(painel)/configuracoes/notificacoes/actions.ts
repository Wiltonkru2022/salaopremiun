"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  DEFAULT_SALON_NOTIFICATION_SETTINGS,
  mapSettingsToDbPayload,
  type SalonNotificationSettings,
} from "@/lib/salon-notification-settings";

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readSettings(formData: FormData): SalonNotificationSettings {
  const minutos = Number(formData.get("lembreteMinutosAntes") || 30);

  return {
    clienteAgendamentoConfirmado: isChecked(formData, "clienteAgendamentoConfirmado"),
    clienteLembrete30min: isChecked(formData, "clienteLembrete30min"),
    clienteAtendimentoFinalizado: isChecked(formData, "clienteAtendimentoFinalizado"),
    clienteAvaliarAtendimento: isChecked(formData, "clienteAvaliarAtendimento"),
    clienteReagendamento: isChecked(formData, "clienteReagendamento"),
    clienteCancelamento: isChecked(formData, "clienteCancelamento"),
    profissionalLembrete30min: isChecked(formData, "profissionalLembrete30min"),
    profissionalAtendimentoFinalizado: isChecked(formData, "profissionalAtendimentoFinalizado"),
    profissionalReagendamento: isChecked(formData, "profissionalReagendamento"),
    profissionalCancelamento: isChecked(formData, "profissionalCancelamento"),
    salaoNovoAgendamentoApp: isChecked(formData, "salaoNovoAgendamentoApp"),
    salaoCancelamentoCliente: isChecked(formData, "salaoCancelamentoCliente"),
    salaoReagendamentoCliente: isChecked(formData, "salaoReagendamentoCliente"),
    salaoAvaliacoes: isChecked(formData, "salaoAvaliacoes"),
    lembreteMinutosAntes: Number.isFinite(minutos)
      ? Math.min(Math.max(Math.round(minutos), 5), 240)
      : DEFAULT_SALON_NOTIFICATION_SETTINGS.lembreteMinutosAntes,
  };
}

function buildRedirect(status: "salvo" | "erro", message: string) {
  return `/configuracoes/notificacoes?${status}=${encodeURIComponent(message)}`;
}

export async function salvarConfiguracoesNotificacoesAction(formData: FormData) {
  const { usuario } = await getPainelUserContext();
  if (!usuario?.id_salao) {
    redirect(buildRedirect("erro", "Nao foi possivel identificar seu salao."));
  }

  const settings = readSettings(formData);

  try {
    await runAdminOperation({
      action: "salvar_configuracoes_notificacoes",
      actorId: usuario.id,
      idSalao: usuario.id_salao,
      run: async (supabase) => {
        const { error } = await (supabase as any)
          .from("configuracoes_notificacoes")
          .upsert(
            {
              id_salao: usuario.id_salao,
              ...mapSettingsToDbPayload(settings),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id_salao" }
          );

        if (error) throw new Error(error.message);
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel salvar as configuracoes.";
    redirect(buildRedirect("erro", message));
  }

  revalidatePath("/configuracoes/notificacoes");
  redirect(buildRedirect("salvo", "Configuracoes de notificacao salvas."));
}
