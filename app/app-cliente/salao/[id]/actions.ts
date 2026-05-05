"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { createClienteAppAppointment } from "@/app/services/cliente-app/appointments";

export type ClienteBookingState = {
  error: string | null;
};

export async function createClienteBookingAction(
  _prevState: ClienteBookingState,
  formData: FormData
): Promise<ClienteBookingState> {
  const session = await requireClienteAppContext();
  const idSalao = String(formData.get("salao") || "").trim();
  const idServico = String(formData.get("servico") || "").trim();
  const idProfissional = String(formData.get("profissional") || "").trim();
  const data = String(formData.get("data") || "");
  const horaInicio = String(formData.get("hora_inicio") || "");
  const observacoes = String(formData.get("observacoes") || "");

  if (idSalao !== session.idSalao) {
    return {
      error:
        "Sua conta atual pertence a outro salao. Entre com uma conta ligada a este perfil para agendar.",
    };
  }

  const result = await createClienteAppAppointment({
    idSalao,
    idCliente: session.idCliente,
    idServico,
    idProfissional,
    data,
    horaInicio,
    observacoes,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/app-cliente/salao/${idSalao}`);
  revalidatePath("/app-cliente/agendamentos");
  redirect("/app-cliente/agendamentos?status=agendado");
}
