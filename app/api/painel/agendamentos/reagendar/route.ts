import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { notifyAppointmentRescheduled } from "@/lib/notification-jobs";
import {
  buscarConfiguracaoAgendaProfissional,
  validarHorarioAgendamento,
} from "@/app/services/profissional/agenda";

const STATUS_SEM_CONFLITO = new Set(["cancelado", "faltou", "atendido", "expirado"]);

function normalizeTime(value: unknown) {
  return String(value || "").trim().slice(0, 5);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return (
    timeToMinutes(aStart) < timeToMinutes(bEnd) &&
    timeToMinutes(aEnd) > timeToMinutes(bStart)
  );
}

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessão expirada." }, { status: 401 });
  }
  if (!usuario?.id_salao || usuario.status !== "ativo") {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    await requireSalaoPermission(usuario.id_salao, "agenda_editar");

    const body = await request.json().catch(() => ({}));
    const idAgendamento = String(body.idAgendamento || "").trim();
    const data = String(body.data || "").trim().slice(0, 10);
    const horaInicio = normalizeTime(body.horaInicio);
    const horaFim = normalizeTime(body.horaFim);

    if (!idAgendamento || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !horaInicio || !horaFim) {
      return NextResponse.json(
        { ok: false, error: "Informe agendamento, data e horários válidos." },
        { status: 400 }
      );
    }

    const inicioMin = timeToMinutes(horaInicio);
    const fimMin = timeToMinutes(horaFim);
    const duracaoMinutos = fimMin - inicioMin;
    if (!Number.isFinite(duracaoMinutos) || duracaoMinutos <= 0) {
      return NextResponse.json(
        { ok: false, error: "O horário final precisa ser maior que o inicial." },
        { status: 400 }
      );
    }

    const database = getDatabaseAdmin();
    const { data: current, error: loadError } = await (database as any)
      .from("agendamentos")
      .select("id, data, hora_inicio, hora_fim, profissional_id, status")
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    const idProfissional = String(current.profissional_id || "").trim();
    if (!idProfissional) throw new Error("Profissional do agendamento não identificado.");

    const configProfissional = await buscarConfiguracaoAgendaProfissional(
      usuario.id_salao,
      idProfissional
    );
    const horarioValidado = validarHorarioAgendamento({
      dataISO: data,
      horaInicio,
      duracaoMinutos,
      diasTrabalho: configProfissional.diasTrabalho,
      pausas: configProfissional.pausas,
    });

    if (normalizeTime(horarioValidado.horaFim) !== horaFim) {
      throw new Error("O intervalo informado não corresponde ao horário validado.");
    }

    const [agendamentosResult, bloqueiosResult] = await Promise.all([
      (database as any)
        .from("agendamentos")
        .select("id, hora_inicio, hora_fim, status")
        .eq("id_salao", usuario.id_salao)
        .eq("profissional_id", idProfissional)
        .eq("data", data)
        .neq("id", idAgendamento),
      (database as any)
        .from("agenda_bloqueios")
        .select("id, hora_inicio, hora_fim")
        .eq("id_salao", usuario.id_salao)
        .eq("profissional_id", idProfissional)
        .eq("data", data),
    ]);

    if (agendamentosResult.error) throw new Error(agendamentosResult.error.message);
    if (bloqueiosResult.error) throw new Error(bloqueiosResult.error.message);

    const conflitoAgendamento = (agendamentosResult.data || []).some(
      (item: Record<string, unknown>) =>
        !STATUS_SEM_CONFLITO.has(String(item.status || "").toLowerCase()) &&
        overlaps(
          horaInicio,
          horaFim,
          normalizeTime(item.hora_inicio),
          normalizeTime(item.hora_fim)
        )
    );
    const conflitoBloqueio = (bloqueiosResult.data || []).some(
      (item: Record<string, unknown>) =>
        overlaps(
          horaInicio,
          horaFim,
          normalizeTime(item.hora_inicio),
          normalizeTime(item.hora_fim)
        )
    );

    if (conflitoAgendamento || conflitoBloqueio) {
      return NextResponse.json(
        { ok: false, error: "Esse horário já possui outro agendamento ou bloqueio." },
        { status: 409 }
      );
    }

    const previousDate = String(current.data || "").slice(0, 10);
    const previousTime = normalizeTime(current.hora_inicio);
    const mudouDataOuInicio = previousDate !== data || previousTime !== horaInicio;
    const patch: Record<string, unknown> = {
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      updated_at: new Date().toISOString(),
    };

    if (mudouDataOuInicio) {
      patch.status = "pendente";
      patch.cliente_confirmacao_status = "aguardando";
      patch.cliente_confirmou_em = null;
      patch.cliente_cancelou_em = null;
    }

    const { error: updateError } = await (database as any)
      .from("agendamentos")
      .update(patch)
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao);
    if (updateError) throw new Error(updateError.message);

    if (mudouDataOuInicio) {
      await notifyAppointmentRescheduled({
        idAgendamento,
        idSalao: usuario.id_salao,
        actor: "salao",
        previousDate,
        previousTime,
      });
    }

    return NextResponse.json({
      ok: true,
      status: mudouDataOuInicio ? "pendente" : String(current.status || "pendente"),
    });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 400)
        : 400;
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível reagendar.",
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 400 }
    );
  }
}
