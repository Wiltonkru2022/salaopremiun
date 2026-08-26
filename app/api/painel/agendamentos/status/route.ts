import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
import {
  notifyAppointmentCanceled,
  notifyAppointmentFinished,
  notifyClientAboutSalonConfirmation,
  scheduleAppointmentReminderNotifications,
} from "@/lib/notification-jobs";
import { notifyClientAppointmentConfirmed } from "@/lib/push-notifications";
import { notifyWaitlistAboutReleasedSlot } from "@/lib/client-app/waitlist";
import { buscarServicoPorId } from "@/app/services/profissional/agenda";

const STATUS_PERMITIDOS = new Set([
  "pendente",
  "confirmado",
  "em_atendimento",
  "atendido",
  "aguardando_pagamento",
  "aguardando_confirmacao_salao",
  "aguardando_confirmacao_profissional",
  "reservado_aguardando_pagamento",
  "cancelado",
  "faltou",
]);

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessão expirada." }, { status: 401 });
  }
  if (!usuario?.id_salao || usuario.status !== "ativo") {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const idAgendamento = String(body.idAgendamento || "").trim();
    const status = String(body.status || "").trim().toLowerCase();

    if (!idAgendamento || !status) {
      return NextResponse.json(
        { ok: false, error: "Agendamento e status são obrigatórios." },
        { status: 400 }
      );
    }
    if (!STATUS_PERMITIDOS.has(status)) {
      return NextResponse.json(
        { ok: false, error: "Status de agendamento inválido." },
        { status: 400 }
      );
    }

    await requireSalaoPermission(
      usuario.id_salao,
      status === "cancelado" ? "agenda_excluir" : "agenda_editar"
    );

    const supabase = getDatabaseAdmin();
    const { data: appointment, error: loadError } = await (supabase as any)
      .from("agendamentos")
      .select(
        "id, status, sinal_status, cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim, id_comanda"
      )
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!appointment) {
      return NextResponse.json(
        { ok: false, error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    const previousStatus = String(appointment.status || "").toLowerCase();
    if (status === "cancelado") {
      if (["cancelado", "atendido", "faltou"].includes(previousStatus)) {
        throw new Error("Este agendamento não pode mais ser cancelado.");
      }

      await cancelarAgendamentoComComanda({
        supabase: supabase as any,
        idSalao: usuario.id_salao,
        idAgendamento,
      });

      await notifyAppointmentCanceled({
        idSalao: usuario.id_salao,
        idAgendamento,
        idCliente: appointment.cliente_id,
        idProfissional: appointment.profissional_id,
        data: appointment.data,
        horaInicio: appointment.hora_inicio,
        actor: "salao",
      });

      try {
        const servico = appointment.servico_id
          ? await buscarServicoPorId(usuario.id_salao, String(appointment.servico_id))
          : null;
        await notifyWaitlistAboutReleasedSlot({
          supabaseAdmin: supabase,
          releasedSlot: {
            idSalao: usuario.id_salao,
            idServico: appointment.servico_id || null,
            idProfissional: appointment.profissional_id || null,
            data: appointment.data,
            horaInicio: appointment.hora_inicio,
            servicoNome: servico?.nome || null,
          },
        });
      } catch {
        // O cancelamento já foi concluído; a fila de espera não bloqueia a operação.
      }

      return NextResponse.json({ ok: true, status: "cancelado" });
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === "confirmado") {
      patch.cliente_confirmacao_status = "aguardando";
      patch.cliente_confirmou_em = null;
      patch.cliente_cancelou_em = null;
      if (appointment.sinal_status) {
        patch.sinal_status = "confirmado";
        patch.sinal_confirmado_em = now;
        patch.sinal_confirmado_por_tipo = "salao";
        patch.sinal_confirmado_por_nome = "Recepção do salão";
        patch.reserva_expira_em = null;
      }
    }

    const { error: updateError } = await (supabase as any)
      .from("agendamentos")
      .update(patch)
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao);
    if (updateError) throw new Error(updateError.message);

    if (status === "confirmado" && previousStatus !== "confirmado") {
      await notifyClientAppointmentConfirmed({
        idAgendamento,
        idSalao: usuario.id_salao,
      });
      await notifyClientAboutSalonConfirmation({
        idAgendamento,
        idSalao: usuario.id_salao,
      });
      await scheduleAppointmentReminderNotifications({
        idAgendamento,
        idSalao: usuario.id_salao,
      });
    }

    if (status === "atendido" && previousStatus !== "atendido") {
      await notifyAppointmentFinished({
        idAgendamento,
        idSalao: usuario.id_salao,
      });
    }

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 400)
        : 400;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o agendamento.",
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 400 }
    );
  }
}
