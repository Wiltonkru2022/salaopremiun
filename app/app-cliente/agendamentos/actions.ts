"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import {
  cancelClienteAppAppointment,
  reviewClienteAppAppointment,
} from "@/app/services/cliente-app/appointments";

export type ClienteAppointmentActionState = {
  error: string | null;
};

function buildReturnUrl(status: string) {
  return `/app-cliente/agendamentos?status=${status}`;
}

export async function cancelClienteAppointmentAction(
  _prevState: ClienteAppointmentActionState,
  formData: FormData
): Promise<ClienteAppointmentActionState> {
  const session = await requireClienteAppContext();
  const idAgendamento = String(formData.get("agendamento") || "").trim();

  const result = await cancelClienteAppAppointment({
    idConta: session.idConta,
    idAgendamento,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/app-cliente/agendamentos");
  redirect(buildReturnUrl("cancelado"));
}

export async function reviewClienteAppointmentAction(
  _prevState: ClienteAppointmentActionState,
  formData: FormData
): Promise<ClienteAppointmentActionState> {
  const session = await requireClienteAppContext();
  const idAgendamento = String(formData.get("agendamento") || "").trim();
  const nota = Number(formData.get("nota") || 0);
  const comentario = String(formData.get("comentario") || "");

  const result = await reviewClienteAppAppointment({
    idConta: session.idConta,
    idAgendamento,
    nota,
    comentario,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/app-cliente/agendamentos");
  redirect(buildReturnUrl("avaliado"));
}
