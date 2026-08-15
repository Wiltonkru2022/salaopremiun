import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  notifyClientAboutSalonConfirmation,
  notifyAppointmentRescheduled,
  scheduleAppointmentReminderNotifications,
} from "@/lib/notification-jobs";
import { notifyClientAppointmentConfirmed } from "@/lib/push-notifications";

function time(value: unknown) {
  return String(value || "").trim().slice(0, 5);
}

export async function POST(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const idAgendamento = String(body.agendamentoId || "").trim();

    if (!idAgendamento || !["confirmar", "reagendar"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Ação de agenda inválida." }, { status: 400 });
    }

    const result = await runAdminOperation({
      action: `app_profissional_pwa_${action}`,
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        let query = (supabase as any)
          .from("agendamentos")
          .select("id, profissional_id, data, hora_inicio, hora_fim, status")
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao);

        if (!session.podeVerAgendaTodos) {
          query = query.eq("profissional_id", session.idProfissional);
        }

        const { data: current, error: loadError } = await query.maybeSingle();
        if (loadError) throw new Error(loadError.message);
        if (!current) throw new Error("Agendamento não encontrado.");

        const previousDate = String(current.data || "").slice(0, 10);
        const previousTime = time(current.hora_inicio);
        const now = new Date().toISOString();

        if (action === "confirmar") {
          const { error } = await (supabase as any)
            .from("agendamentos")
            .update({
              status: "confirmado",
              cliente_confirmacao_status: "aguardando",
              updated_at: now,
            })
            .eq("id", idAgendamento)
            .eq("id_salao", session.idSalao);
          if (error) throw new Error(error.message);
        } else {
          const data = String(body.data || "").trim().slice(0, 10);
          const horaInicio = time(body.horaInicio);
          const horaFim = time(body.horaFim);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !horaInicio || !horaFim) {
            throw new Error("Informe data e horário válidos.");
          }
          if (horaFim <= horaInicio) {
            throw new Error("O horário final precisa ser maior que o inicial.");
          }

          const { error } = await (supabase as any)
            .from("agendamentos")
            .update({
              data,
              hora_inicio: horaInicio,
              hora_fim: horaFim,
              status: "pendente",
              cliente_confirmacao_status: "aguardando",
              cliente_confirmou_em: null,
              cliente_cancelou_em: null,
              updated_at: now,
            })
            .eq("id", idAgendamento)
            .eq("id_salao", session.idSalao);
          if (error) throw new Error(error.message);

          await notifyAppointmentRescheduled({
            idAgendamento,
            idSalao: session.idSalao,
            actor: "profissional",
            previousDate,
            previousTime,
          });
          return { id: idAgendamento, action, data, horaInicio };
        }

        await notifyClientAppointmentConfirmed({
          idAgendamento,
          idSalao: session.idSalao,
        });
        await notifyClientAboutSalonConfirmation({
          idAgendamento,
          idSalao: session.idSalao,
        });
        await scheduleAppointmentReminderNotifications({
          idAgendamento,
          idSalao: session.idSalao,
        });

        return { id: idAgendamento, action };
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível atualizar o agendamento." },
      { status: 400 }
    );
  }
}
