import "server-only";

import {
  processPendingNotificationJobs,
  queueNotificationJob,
} from "@/lib/notification-jobs";

export type ReleasedAppointmentSlot = {
  idSalao: string;
  idServico: string | null;
  idProfissional: string | null;
  data: string | null;
  horaInicio: string | null;
  servicoNome?: string | null;
};

export async function notifyWaitlistAboutReleasedSlot(params: {
  supabaseAdmin: any;
  releasedSlot: ReleasedAppointmentSlot;
}) {
  const slot = params.releasedSlot;
  if (!slot.idServico || !slot.idProfissional || !slot.data) return { notified: 0 };

  const { data } = await (params.supabaseAdmin as any)
    .from("lista_espera_agendamentos")
    .select(
      "id, cliente_app_conta_id, id_cliente, id_servico, id_profissional, data_preferida"
    )
    .eq("id_salao", slot.idSalao)
    .eq("status", "ativo")
    .order("created_at", { ascending: true })
    .limit(50);

  const candidates = ((data || []) as Array<Record<string, unknown>>)
    .filter((item) => {
      const idServico = String(item.id_servico || "").trim();
      const idProfissional = String(item.id_profissional || "").trim();
      const dataPreferida = String(item.data_preferida || "").trim();

      return (
        (!idServico || idServico === slot.idServico) &&
        (!idProfissional || idProfissional === slot.idProfissional) &&
        (!dataPreferida || dataPreferida === slot.data)
      );
    })
    .slice(0, 10);

  if (!candidates.length) return { notified: 0 };

  const now = new Date().toISOString();
  await (params.supabaseAdmin as any)
    .from("lista_espera_agendamentos")
    .update({
      status: "avisado",
      ultimo_aviso_em: now,
      updated_at: now,
    })
    .in(
      "id",
      candidates.map((item) => String(item.id || "")).filter(Boolean)
    );

  await Promise.allSettled(
    candidates.map((item) =>
      queueNotificationJob({
        idSalao: slot.idSalao,
        idCliente: String(item.id_cliente || "").trim() || null,
        clienteAppContaId:
          String(item.cliente_app_conta_id || "").trim() || null,
        canal: "cliente_app",
        tipo: "lista_espera_horario_liberado",
        titulo: "Horário liberado",
        mensagem: `${slot.servicoNome || "Um serviço"} abriu vaga em ${
          slot.data || "uma data próxima"
        } às ${String(slot.horaInicio || "").slice(0, 5)}.`,
        url: `/app-cliente/salao/${slot.idSalao}`,
        tag: `lista-espera-${slot.idSalao}`,
        idempotencyKey: `lista-espera-${slot.idSalao}-${slot.idServico}-${slot.idProfissional}-${slot.data}-${slot.horaInicio}-${item.id}`,
        metadata: {
          origem: "lista_espera",
          idListaEspera: item.id,
        },
      })
    )
  );

  await processPendingNotificationJobs(20);

  return { notified: candidates.length };
}
