import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  notifyClientAboutSalonConfirmation,
  scheduleAppointmentReminderNotifications,
} from "@/lib/notification-jobs";
import { notifyClientAppointmentConfirmed } from "@/lib/push-notifications";

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

    const supabase = getSupabaseAdmin();
    const { data: appointment, error: loadError } = await (supabase as any)
      .from("agendamentos")
      .select("id, status, sinal_status")
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

    if (
      status === "confirmado" &&
      String(appointment.status || "").toLowerCase() !== "confirmado"
    ) {
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

    return NextResponse.json({ ok: true });
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
