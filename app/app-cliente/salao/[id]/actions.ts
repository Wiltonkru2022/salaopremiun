"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import {
  createClienteAppAppointment,
  joinClienteAppWaitlist,
} from "@/app/services/cliente-app/appointments";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  const idsServicos = formData
    .getAll("servicos")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const idProfissional = String(formData.get("profissional") || "").trim();
  const data = String(formData.get("data") || "");
  const horaInicio = String(formData.get("hora_inicio") || "");
  const observacoes = String(formData.get("observacoes") || "");
  const pessoaAgendadaTipo = String(formData.get("pessoa_tipo") || "mim");
  const pessoaAgendadaNome = String(formData.get("pessoa_nome") || "");
  const pessoaAgendadaWhatsapp = String(formData.get("pessoa_whatsapp") || "");
  const pessoaAgendadaObservacao = String(formData.get("pessoa_observacao") || "");
  const codigoCupom = String(formData.get("cupom") || "");
  const adicionaisIds = formData
    .getAll("adicionais")
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const result = await createClienteAppAppointment({
    idSalao,
    idConta: session.idConta,
    idServico,
    idsServicos,
    idProfissional,
    data,
    horaInicio,
    observacoes,
    pessoaAgendadaTipo,
    pessoaAgendadaNome,
    pessoaAgendadaWhatsapp,
    pessoaAgendadaObservacao,
    adicionaisIds,
    codigoCupom,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/app-cliente/salao/${idSalao}`);
  revalidatePath("/app-cliente/agendamentos");

  if (result.requiresSignal && result.idAgendamento) {
    redirect(`/app-cliente/agendamentos/${result.idAgendamento}/sinal`);
  }

  redirect("/app-cliente/agendamentos?status=agendado");
}

export async function joinClienteWaitlistAction(formData: FormData) {
  const session = await requireClienteAppContext();
  const idSalao = String(formData.get("salao") || "").trim();
  const idServico = String(formData.get("servico") || "").trim();
  const idProfissional = String(formData.get("profissional") || "").trim();
  const dataPreferida = String(formData.get("data") || "").trim();

  const result = await joinClienteAppWaitlist({
    idConta: session.idConta,
    idSalao,
    idServico,
    idProfissional,
    dataPreferida,
  });

  if (!result.ok) {
    redirect(`/app-cliente/salao/${idSalao}?status=lista_espera_erro`);
  }

  revalidatePath(`/app-cliente/salao/${idSalao}`);
  redirect(`/app-cliente/salao/${idSalao}?status=lista_espera`);
}

export async function toggleClienteSalonFavoriteAction(formData: FormData) {
  const session = await requireClienteAppContext();
  const idSalao = String(formData.get("salao") || "").trim();
  const nextFavorite = String(formData.get("next_favorite") || "") === "true";

  if (!idSalao) return;

  const supabaseAdmin = getSupabaseAdmin();

  if (nextFavorite) {
    await (supabaseAdmin as any).from("clientes_app_favoritos").upsert(
      {
        cliente_app_conta_id: session.idConta,
        id_salao: idSalao,
      },
      {
        onConflict: "cliente_app_conta_id,id_salao",
      }
    );
  } else {
    await (supabaseAdmin as any)
      .from("clientes_app_favoritos")
      .delete()
      .eq("cliente_app_conta_id", session.idConta)
      .eq("id_salao", idSalao);
  }

  revalidatePath(`/app-cliente/salao/${idSalao}`);
  revalidatePath("/app-cliente");
  revalidatePath("/app-cliente/inicio");
}
