import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  buscarConfiguracaoAgendaProfissional,
  validarHorarioAgendamento,
} from "@/app/services/profissional/agenda";
import {
  notifyClientAboutSalonConfirmation,
  notifyAppointmentRescheduled,
  scheduleAppointmentReminderNotifications,
} from "@/lib/notification-jobs";
import { notifyClientAppointmentConfirmed } from "@/lib/push-notifications";

function time(value: unknown) {
  return String(value || "").trim().slice(0, 5);
}

function timeToMinutes(value: string) {
  const [hour, minute] = time(value).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.NaN;
  return hour * 60 + minute;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const a1 = timeToMinutes(aStart);
  const a2 = timeToMinutes(aEnd);
  const b1 = timeToMinutes(bStart);
  const b2 = timeToMinutes(bEnd);
  return [a1, a2, b1, b2].every(Number.isFinite) && a1 < b2 && a2 > b1;
}

export async function POST(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const idAgendamento = String(body.agendamentoId || "").trim();

    if (!idAgendamento || !["confirmar", "confirmar_pix", "reagendar"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Ação de agenda inválida." }, { status: 400 });
    }

    const result = await runAdminOperation({
      action: `app_profissional_pwa_${action}`,
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        let query = (supabase as any)
          .from("agendamentos")
          .select("id, profissional_id, data, hora_inicio, hora_fim, status, sinal_status")
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

        if (action === "confirmar_pix") {
          const { data: profissional, error: profissionalError } = await (supabase as any)
            .from("profissionais")
            .select("sinal_confirmacao_responsavel")
            .eq("id", current.profissional_id)
            .eq("id_salao", session.idSalao)
            .maybeSingle();
          if (profissionalError) throw new Error(profissionalError.message);
          if (String(profissional?.sinal_confirmacao_responsavel || "") !== "profissional") {
            throw new Error("Este profissional nao esta configurado para confirmar sinais.");
          }
          if (String(current.sinal_status || "").toLowerCase() !== "comprovante_enviado") {
            throw new Error("Este agendamento nao possui comprovante Pix aguardando confirmacao.");
          }
          const { error } = await (supabase as any)
            .from("agendamentos")
            .update({
              sinal_status: "confirmado",
              sinal_confirmado_em: now,
              sinal_confirmado_por_tipo: "profissional",
              sinal_confirmado_por_id: session.idProfissional,
              reserva_expira_em: null,
              updated_at: now,
            })
            .eq("id", idAgendamento)
            .eq("id_salao", session.idSalao)
            .eq("profissional_id", current.profissional_id);
          if (error) throw new Error(error.message);
          return { id: idAgendamento, action };
        }

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
          const inicioMinutos = timeToMinutes(horaInicio);
          const fimMinutos = timeToMinutes(horaFim);

          if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isFinite(inicioMinutos) || !Number.isFinite(fimMinutos)) {
            throw new Error("Informe data e horário válidos.");
          }
          if (fimMinutos <= inicioMinutos) {
            throw new Error("O horário final precisa ser maior que o inicial.");
          }

          const agendaConfig = await buscarConfiguracaoAgendaProfissional(
            session.idSalao,
            String(current.profissional_id)
          );
          validarHorarioAgendamento({
            dataISO: data,
            horaInicio,
            duracaoMinutos: fimMinutos - inicioMinutos,
            diasTrabalho: agendaConfig.diasTrabalho,
            pausas: agendaConfig.pausas,
          });

          const [appointmentsResult, blocksResult] = await Promise.all([
            (supabase as any)
              .from("agendamentos")
              .select("id, hora_inicio, hora_fim, status")
              .eq("id_salao", session.idSalao)
              .eq("profissional_id", current.profissional_id)
              .eq("data", data)
              .neq("id", idAgendamento),
            (supabase as any)
              .from("agenda_bloqueios")
              .select("id, hora_inicio, hora_fim")
              .eq("id_salao", session.idSalao)
              .eq("profissional_id", current.profissional_id)
              .eq("data", data),
          ]);

          if (appointmentsResult.error) throw new Error(appointmentsResult.error.message);
          if (blocksResult.error) throw new Error(blocksResult.error.message);

          const activeAppointments = (appointmentsResult.data || []).filter(
            (item: any) => !["cancelado", "faltou", "expirado", "atendido"].includes(String(item.status || "").toLowerCase())
          );
          const appointmentConflict = activeAppointments.some((item: any) =>
            overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
          );
          const blockConflict = (blocksResult.data || []).some((item: any) =>
            overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
          );

          if (appointmentConflict || blockConflict) {
            throw new Error("Esse horário já possui outro agendamento ou bloqueio.");
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
