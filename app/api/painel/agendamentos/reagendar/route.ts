import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notifyAppointmentRescheduled } from "@/lib/notification-jobs";

function normalizeTime(value: unknown) {
  return String(value || "").trim().slice(0, 5);
}

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();
  if (!user) return NextResponse.json({ ok: false, error: "Sessão expirada." }, { status: 401 });
  if (!usuario?.id_salao || usuario.status !== "ativo") {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const idAgendamento = String(body.idAgendamento || "").trim();
    const data = String(body.data || "").trim().slice(0, 10);
    const horaInicio = normalizeTime(body.horaInicio);
    const horaFim = normalizeTime(body.horaFim);

    if (!idAgendamento || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !horaInicio || !horaFim) {
      return NextResponse.json({ ok: false, error: "Informe agendamento, data e horários válidos." }, { status: 400 });
    }
    if (horaFim <= horaInicio) {
      return NextResponse.json({ ok: false, error: "O horário final precisa ser maior que o inicial." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: current, error: loadError } = await (supabase as any)
      .from("agendamentos")
      .select("id, data, hora_inicio, profissional_id")
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!current) return NextResponse.json({ ok: false, error: "Agendamento não encontrado." }, { status: 404 });

    const { error: updateError } = await (supabase as any)
      .from("agendamentos")
      .update({
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        status: "pendente",
        cliente_confirmacao_status: "aguardando",
        cliente_confirmou_em: null,
        cliente_cancelou_em: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao);
    if (updateError) throw new Error(updateError.message);

    await notifyAppointmentRescheduled({
      idAgendamento,
      idSalao: usuario.id_salao,
      actor: "salao",
      previousDate: String(current.data || "").slice(0, 10),
      previousTime: normalizeTime(current.hora_inicio),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível reagendar." },
      { status: 400 }
    );
  }
}
