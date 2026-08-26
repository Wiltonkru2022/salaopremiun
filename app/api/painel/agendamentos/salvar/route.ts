import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { registrarCriacaoAgendamento } from "@/lib/agenda/agendamento-audit";
import {
  buscarConfiguracaoAgendaProfissional,
  buscarServicoDoProfissional,
  validarHorarioAgendamento,
  validarServicoVinculadoAoProfissional,
} from "@/app/services/profissional/agenda";
import {
  notifyAppointmentRescheduled,
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
  "faltou",
]);

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

function getMonthRange(dateString: string) {
  const baseDate = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("Data do agendamento inválida.");
  }

  const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const toIso = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return { start: toIso(first), end: toIso(last) };
}

async function assertMonthlyLimit(params: {
  idSalao: string;
  date: string;
  currentAppointmentId?: string | null;
}) {
  if (params.currentAppointmentId) return;

  const access = await getPlanoAccessSnapshot(params.idSalao);
  const limite = access.limites.agendamentosMensais;
  if (limite == null) return;

  const database = getDatabaseAdmin();
  const range = getMonthRange(params.date);
  const { count, error } = await (database as any)
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("id_salao", params.idSalao)
    .gte("data", range.start)
    .lte("data", range.end);

  if (error) throw new Error(error.message);
  if (Number(count || 0) >= limite) {
    throw new Error(
      `Limite do plano atingido: ${Number(count || 0)} de ${limite} agendamentos no mês.`
    );
  }
}

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessão expirada." }, { status: 401 });
  }
  if (!usuario?.id_salao || String(usuario.status || "").toLowerCase() !== "ativo") {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const idAgendamento = String(body.idAgendamento || "").trim() || null;
    const idCliente = String(body.idCliente || "").trim();
    const idProfissional = String(body.idProfissional || "").trim();
    const idServico = String(body.idServico || "").trim();
    const idComanda = String(body.idComanda || "").trim() || null;
    const data = String(body.data || "").trim().slice(0, 10);
    const horaInicio = normalizeTime(body.horaInicio);
    const observacoes = String(body.observacoes || "").trim() || null;
    const status = String(body.status || "confirmado").trim().toLowerCase();

    if (!idCliente || !idProfissional || !idServico) {
      return NextResponse.json(
        { ok: false, error: "Preencha profissional, cliente e serviço." },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(horaInicio)) {
      return NextResponse.json(
        { ok: false, error: "Informe data e horário válidos." },
        { status: 400 }
      );
    }
    if (!STATUS_PERMITIDOS.has(status)) {
      return NextResponse.json(
        { ok: false, error: "Status de agendamento inválido." },
        { status: 400 }
      );
    }

    const permission = idAgendamento
      ? status === "cancelado"
        ? "agenda_excluir"
        : "agenda_editar"
      : "agenda_criar";
    const authz = await requireSalaoPermission(usuario.id_salao, permission);

    await Promise.all([
      validarServicoVinculadoAoProfissional(
        usuario.id_salao,
        idProfissional,
        idServico
      ),
      assertMonthlyLimit({
        idSalao: usuario.id_salao,
        date: data,
        currentAppointmentId: idAgendamento,
      }),
    ]);

    const [configProfissional, servico] = await Promise.all([
      buscarConfiguracaoAgendaProfissional(usuario.id_salao, idProfissional),
      buscarServicoDoProfissional({
        idSalao: usuario.id_salao,
        idProfissional,
        idServico,
      }),
    ]);

    const duracaoMinutos = Number(servico.duracao_minutos || 0) || 30;
    const horario = validarHorarioAgendamento({
      dataISO: data,
      horaInicio,
      duracaoMinutos,
      diasTrabalho: configProfissional.diasTrabalho,
      pausas: configProfissional.pausas,
    });
    const horaFim = normalizeTime(horario.horaFim);

    const database = getDatabaseAdmin();
    const [clienteResult, conflitosResult, bloqueiosResult, currentResult, comandaResult] =
      await Promise.all([
        (database as any)
          .from("clientes")
          .select("id")
          .eq("id", idCliente)
          .eq("id_salao", usuario.id_salao)
          .maybeSingle(),
        (database as any)
          .from("agendamentos")
          .select("id, hora_inicio, hora_fim, status")
          .eq("id_salao", usuario.id_salao)
          .eq("profissional_id", idProfissional)
          .eq("data", data),
        (database as any)
          .from("agenda_bloqueios")
          .select("id, hora_inicio, hora_fim")
          .eq("id_salao", usuario.id_salao)
          .eq("profissional_id", idProfissional)
          .eq("data", data),
        idAgendamento
          ? (database as any)
              .from("agendamentos")
              .select("id, data, hora_inicio, status, id_comanda")
              .eq("id", idAgendamento)
              .eq("id_salao", usuario.id_salao)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        idComanda
          ? (database as any)
              .from("comandas")
              .select("id, id_cliente")
              .eq("id", idComanda)
              .eq("id_salao", usuario.id_salao)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    for (const result of [
      clienteResult,
      conflitosResult,
      bloqueiosResult,
      currentResult,
      comandaResult,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }
    if (!clienteResult.data?.id) throw new Error("Cliente não encontrado neste salão.");
    if (idAgendamento && !currentResult.data?.id) {
      throw new Error("Agendamento não encontrado.");
    }
    if (idComanda && !comandaResult.data?.id) {
      throw new Error("Comanda não encontrada neste salão.");
    }
    if (
      idComanda &&
      comandaResult.data?.id_cliente &&
      String(comandaResult.data.id_cliente) !== idCliente
    ) {
      throw new Error("A comanda selecionada pertence a outro cliente.");
    }

    const conflitoAgendamento = (conflitosResult.data || []).some(
      (item: Record<string, unknown>) =>
        String(item.id || "") !== String(idAgendamento || "") &&
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

    const now = new Date().toISOString();
    const dataToSave = {
      cliente_id: idCliente,
      profissional_id: idProfissional,
      servico_id: idServico,
      id_comanda: idComanda,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      duracao_minutos: duracaoMinutos,
      observacoes,
      status,
      updated_at: now,
    };

    let savedId = idAgendamento;
    if (idAgendamento) {
      const { error } = await (database as any)
        .from("agendamentos")
        .update(dataToSave)
        .eq("id", idAgendamento)
        .eq("id_salao", usuario.id_salao);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await (database as any)
        .from("agendamentos")
        .insert({
          id_salao: usuario.id_salao,
          ...dataToSave,
          origem: "painel",
          agendado_por_tipo: "painel",
          agendado_por_id: usuario.id,
          agendado_por_nome:
            String(usuario.nome || "").trim() ||
            String(usuario.email || "").trim() ||
            "Equipe do salão",
          agendado_em: now,
        })
        .select("id, cliente_id, created_at")
        .single();
      if (error) throw new Error(error.message);
      savedId = String(inserted?.id || "");

      if (savedId) {
        await registrarCriacaoAgendamento({
          database,
          idSalao: usuario.id_salao,
          idAgendamento: savedId,
          idCliente,
          origem: "painel",
          atorTipo: "painel",
          atorId: usuario.id,
          atorNome:
            String(usuario.nome || "").trim() ||
            String(usuario.email || "").trim() ||
            "Equipe do salão",
          createdBy: usuario.id,
          createdAt: inserted?.created_at || now,
        });
      }
    }

    const previous = currentResult.data as Record<string, unknown> | null;
    if (idAgendamento && previous) {
      const previousDate = String(previous.data || "").slice(0, 10);
      const previousTime = normalizeTime(previous.hora_inicio);
      if (previousDate !== data || previousTime !== horaInicio) {
        await notifyAppointmentRescheduled({
          idAgendamento,
          idSalao: usuario.id_salao,
          actor: "salao",
          previousDate,
          previousTime,
        });
      }
      if (
        status === "confirmado" &&
        String(previous.status || "").toLowerCase() !== "confirmado"
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
    }

    return NextResponse.json({
      ok: true,
      idAgendamento: savedId,
      horaFim,
      duracaoMinutos,
      actorId: authz.usuario.id,
    });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 400)
        : 400;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Não foi possível salvar o agendamento.",
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 400 }
    );
  }
}
