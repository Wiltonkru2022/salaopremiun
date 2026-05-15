"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import {
  cancelClienteAppAppointment,
  confirmClienteAppAppointment,
  rescheduleClienteAppAppointment,
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

export async function confirmClienteAppointmentAction(
  _prevState: ClienteAppointmentActionState,
  formData: FormData
): Promise<ClienteAppointmentActionState> {
  const session = await requireClienteAppContext();
  const idAgendamento = String(formData.get("agendamento") || "").trim();

  const result = await confirmClienteAppAppointment({
    idConta: session.idConta,
    idAgendamento,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/app-cliente/agendamentos");
  redirect(buildReturnUrl("confirmado"));
}

export async function rescheduleClienteAppointmentAction(
  _prevState: ClienteAppointmentActionState,
  formData: FormData
): Promise<ClienteAppointmentActionState> {
  const session = await requireClienteAppContext();
  const idAgendamento = String(formData.get("agendamento") || "").trim();
  const data = String(formData.get("data") || "").trim();
  const horaInicio = String(formData.get("hora_inicio") || "").trim();

  const result = await rescheduleClienteAppAppointment({
    idConta: session.idConta,
    idAgendamento,
    data,
    horaInicio,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/app-cliente/agendamentos");
  redirect(buildReturnUrl("reagendado"));
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
  revalidatePath(`/app-cliente/agendamentos/${idAgendamento}/avaliar`);
  redirect(`/app-cliente/agendamentos/${idAgendamento}/avaliar?status=avaliado`);
}
