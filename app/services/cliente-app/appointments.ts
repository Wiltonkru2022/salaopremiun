import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";
import { ensureClienteContaVinculadaAoSalao } from "@/app/services/cliente-app/auth";
import {
  ensureDiaFuncionamento,
  validateAgendaTimeRange,
} from "@/lib/agenda/validacoesAgenda";
import {
  addDurationToTime,
  buildTimeSlots,
  buildForaExpedienteBloqueiosDoProfissional,
  buildPausasBloqueiosDoProfissional,
  mergeBloqueios,
  minutesToTime,
  normalizeTimeString,
  overlaps,
  timeToMinutes,
} from "@/lib/utils/agenda";
import type { ConfigSalao, Profissional } from "@/types/agenda";

const CLIENT_BOOKING_BUFFER_MINUTES = 5;
const CLIENT_BOOKING_SLOT_STEP_MINUTES = 5;
const CLIENT_BOOKING_LOOKAHEAD_DAYS = 14;

type ClienteAppActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type ClienteBookingParams = {
  idSalao: string;
  idConta: string;
  idServico: string;
  idProfissional: string;
  data: string;
  horaInicio: string;
  observacoes?: string | null;
};

type ClienteCancelParams = {
  idConta: string;
  idAgendamento: string;
};

type ClienteReviewParams = {
  idConta: string;
  idAgendamento: string;
  nota: number;
  comentario?: string | null;
};

type ClienteAgendamentoOwnership = {
  idSalao: string;
  idCliente: string;
  status: string;
  idComanda: string | null;
};

export type ClienteAppAvailabilitySlot = {
  horaInicio: string;
  horaFim: string;
};

export type ClienteAppAvailabilityDay = {
  data: string;
  rotulo: string;
  horarios: ClienteAppAvailabilitySlot[];
};

export type ClienteAppAvailabilityResult =
  | {
      ok: true;
      intervaloMinutos: number;
      bufferMinutos: number;
      duracaoMinutos: number;
      dias: ClienteAppAvailabilityDay[];
    }
  | { ok: false; error: string };

function normalizeDate(value: string) {
  return String(value || "").trim().slice(0, 10);
}

function isPastDateTime(date: string, time: string) {
  const value = new Date(`${date}T${normalizeTimeString(time)}:00`);
  return Number.isFinite(value.getTime()) && value.getTime() < Date.now();
}

function formatDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildClientDateLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function parseConfigRow(
  row: Record<string, unknown> | null
): ConfigSalao | null {
  if (!row?.id_salao) return null;

  return {
    id_salao: String(row.id_salao),
    hora_abertura: String(row.hora_abertura || "08:00"),
    hora_fechamento: String(row.hora_fechamento || "19:00"),
    intervalo_minutos: Number(row.intervalo_minutos || 15) || 15,
    dias_funcionamento: Array.isArray(row.dias_funcionamento)
      ? row.dias_funcionamento.map((item) => String(item || ""))
      : ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
  };
}

function parseProfissionalRow(row: Record<string, unknown>): Profissional {
  return {
    id: String(row.id || ""),
    id_salao: String(row.id_salao || ""),
    nome:
      String(row.nome_exibicao || "").trim() ||
      String(row.nome || "").trim() ||
      "Profissional",
    foto_url: String(row.foto_url || "").trim() || null,
    categoria: String(row.categoria || "").trim() || null,
    cargo: String(row.cargo || "").trim() || null,
    comissao_percentual: Number(row.comissao_percentual || 0) || null,
    cor_agenda: String(row.cor_agenda || "").trim() || null,
    status: String(row.status || "ativo"),
    ativo:
      row.ativo === null || row.ativo === undefined ? true : Boolean(row.ativo),
    dias_trabalho: (row.dias_trabalho as Profissional["dias_trabalho"]) ?? null,
    pausas: (row.pausas as Profissional["pausas"]) ?? null,
  };
}

function expandAppointmentWindow(params: {
  horaInicio: string;
  horaFim: string;
  bufferMinutes?: number;
}) {
  const buffer = Math.max(Number(params.bufferMinutes || 0), 0);
  const start = Math.max(timeToMinutes(params.horaInicio) - buffer, 0);
  const end = timeToMinutes(params.horaFim) + buffer;

  return {
    horaInicio: minutesToTime(start),
    horaFim: minutesToTime(end),
  };
}

function hasAppointmentConflictWithBuffer(params: {
  horaInicio: string;
  horaFim: string;
  agendamentos: Array<Record<string, unknown>>;
  bufferMinutes?: number;
}) {
  return params.agendamentos.some((item) => {
    const expanded = expandAppointmentWindow({
      horaInicio: normalizeTimeString(String(item.hora_inicio || "")),
      horaFim: normalizeTimeString(String(item.hora_fim || "")),
      bufferMinutes: params.bufferMinutes,
    });

    return overlaps(
      params.horaInicio,
      params.horaFim,
      expanded.horaInicio,
      expanded.horaFim
    );
  });
}

async function loadBookingBaseContext(params: {
  supabaseAdmin: any;
  idSalao: string;
  idServico: string;
  idProfissional: string;
}) {
  const [configResult, profissionalResult, servicoResult, vinculoResult] =
    await Promise.all([
      params.supabaseAdmin
        .from("configuracoes_salao")
        .select(
          "id_salao, hora_abertura, hora_fechamento, intervalo_minutos, dias_funcionamento"
        )
        .eq("id_salao", params.idSalao)
        .limit(1)
        .maybeSingle(),
      (params.supabaseAdmin as any)
        .from("profissionais")
        .select(
          "id, id_salao, nome, nome_exibicao, foto_url, categoria, cargo, comissao_percentual, cor_agenda, status, ativo, dias_trabalho, pausas, app_cliente_visivel, eh_assistente"
        )
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .limit(1)
        .maybeSingle(),
      (params.supabaseAdmin as any)
        .from("servicos")
        .select(
          "id, id_salao, nome, ativo, preco, duracao, duracao_minutos, descricao, app_cliente_visivel"
        )
        .eq("id", params.idServico)
        .eq("id_salao", params.idSalao)
        .limit(1)
        .maybeSingle(),
      params.supabaseAdmin
        .from("profissional_servicos")
        .select("id, duracao_minutos, ativo")
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional)
        .eq("id_servico", params.idServico)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle(),
    ]);

  const config = parseConfigRow(
    (configResult.data as Record<string, unknown> | null) || null
  );

  if (!config) {
    return { ok: false as const, error: "A agenda deste salao ainda nao esta configurada." };
  }

  if (profissionalResult.error || !profissionalResult.data?.id) {
    return { ok: false as const, error: "Profissional nao encontrado." };
  }

  if (
    !profissionalResult.data.app_cliente_visivel ||
    profissionalResult.data.eh_assistente === true ||
    profissionalResult.data.ativo === false
  ) {
    return {
      ok: false as const,
      error: "Este profissional nao esta disponivel no app cliente.",
    };
  }

  if (servicoResult.error || !servicoResult.data?.id) {
    return { ok: false as const, error: "Servico nao encontrado." };
  }

  if (
    !servicoResult.data.app_cliente_visivel ||
    servicoResult.data.ativo === false
  ) {
    return {
      ok: false as const,
      error: "Este servico nao esta disponivel no app cliente.",
    };
  }

  if (vinculoResult.error || !vinculoResult.data?.id) {
    return {
      ok: false as const,
      error: "Este servico nao esta vinculado ao profissional escolhido.",
    };
  }

  const profissional = parseProfissionalRow(
    profissionalResult.data as Record<string, unknown>
  );
  const duracao =
    Number(vinculoResult.data.duracao_minutos || 0) ||
    Number(servicoResult.data.duracao_minutos || servicoResult.data.duracao || 0) ||
    30;

  return {
    ok: true as const,
    config,
    profissional,
    duracao,
  };
}

function buildDisponibilidadeDia(params: {
  data: string;
  config: ConfigSalao;
  profissional: Profissional;
  duracao: number;
  bloqueios: Array<Record<string, unknown>>;
  agendamentos: Array<Record<string, unknown>>;
}) {
  if (!ensureDiaFuncionamento({ config: params.config, dateString: params.data })) {
    return [] as ClienteAppAvailabilitySlot[];
  }

  const autoBloqueios = mergeBloqueios(
    buildPausasBloqueiosDoProfissional({
      idSalao: params.config.id_salao,
      profissionalId: params.profissional.id,
      date: params.data,
      pausas: params.profissional.pausas,
    }),
    buildForaExpedienteBloqueiosDoProfissional({
      idSalao: params.config.id_salao,
      profissionalId: params.profissional.id,
      date: params.data,
      agendaInicio: params.config.hora_abertura,
      agendaFim: params.config.hora_fechamento,
      diasTrabalho: params.profissional.dias_trabalho,
    })
  );

  const bloqueiosDoDia = mergeBloqueios(
    ((params.bloqueios || []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id || ""),
      id_salao: String(item.id_salao || params.config.id_salao),
      profissional_id: String(item.profissional_id || params.profissional.id),
      data: String(item.data || params.data),
      hora_inicio: normalizeTimeString(String(item.hora_inicio || "")),
      hora_fim: normalizeTimeString(String(item.hora_fim || "")),
      motivo: String(item.motivo || "").trim() || null,
    })),
    autoBloqueios
  );

  const step = Math.max(
    Number(params.config.intervalo_minutos || 15),
    CLIENT_BOOKING_SLOT_STEP_MINUTES
  );
  const slots = buildTimeSlots(
    params.config.hora_abertura,
    params.config.hora_fechamento,
    step
  );

  return slots
    .filter((slot) => {
      const horaInicio = slot.time;
      const horaFim = addDurationToTime(horaInicio, params.duracao);

      if (isPastDateTime(params.data, horaInicio)) {
        return false;
      }

      const range = validateAgendaTimeRange({
        config: params.config,
        profissionais: [params.profissional],
        getProfessionalAutoBloqueiosFn: () => [],
        profissionalId: params.profissional.id,
        date: params.data,
        horaInicio,
        horaFim,
      });

      if (!range.ok) {
        return false;
      }

      const conflitoBloqueio = bloqueiosDoDia.some((item) =>
        overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );

      if (conflitoBloqueio) {
        return false;
      }

      return !hasAppointmentConflictWithBuffer({
        horaInicio,
        horaFim,
        agendamentos: params.agendamentos,
        bufferMinutes: CLIENT_BOOKING_BUFFER_MINUTES,
      });
    })
    .map((slot) => ({
      horaInicio: slot.time,
      horaFim: addDurationToTime(slot.time, params.duracao),
    }));
}

async function warmClientAppNextSlotCache(params: {
  supabaseAdmin: any;
  idSalao: string;
  idServico: string;
  idProfissional: string;
  dias: ClienteAppAvailabilityDay[];
}) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString();
  const rows = params.dias
    .flatMap((dia) =>
      dia.horarios.slice(0, 8).map((horario) => ({
        id_salao: params.idSalao,
        id_servico: params.idServico,
        id_profissional: params.idProfissional,
        data: dia.data,
        hora_inicio: horario.horaInicio,
        hora_fim: horario.horaFim,
        expires_at: expiresAt,
      }))
    )
    .slice(0, 40);

  if (!rows.length) return;

  try {
    await (params.supabaseAdmin as any)
      .from("client_app_next_slots")
      .upsert(rows, {
        onConflict: "id_salao,id_servico,id_profissional,data,hora_inicio",
      });
  } catch {
    // Optional rollout cache. Booking never depends on this table being present.
  }
}

async function loadOwnedAppointment(params: {
  supabaseAdmin: any;
  idConta: string;
  idAgendamento: string;
}): Promise<ClienteAgendamentoOwnership | null> {
  const { data: agendamento, error } = await params.supabaseAdmin
    .from("agendamentos")
    .select("id, id_salao, cliente_id, id_comanda, status")
    .eq("id", params.idAgendamento)
    .limit(1)
    .maybeSingle();

  if (error || !agendamento?.id) {
    return null;
  }

  const { data: authRows, error: authError } = await params.supabaseAdmin
    .from("clientes_auth")
    .select("id")
    .eq("id_salao", agendamento.id_salao)
    .eq("id_cliente", agendamento.cliente_id)
    .eq("app_conta_id", params.idConta)
    .eq("app_ativo", true)
    .limit(1);

  if (authError || !authRows?.[0]?.id) {
    return null;
  }

  return {
    idSalao: String(agendamento.id_salao || ""),
    idCliente: String(agendamento.cliente_id || ""),
    status: String(agendamento.status || "").trim() || "pendente",
    idComanda: String(agendamento.id_comanda || "").trim() || null,
  };
}

export async function createClienteAppAppointment(
  params: ClienteBookingParams
): Promise<ClienteAppActionResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idConta = String(params.idConta || "").trim();
  const idServico = String(params.idServico || "").trim();
  const idProfissional = String(params.idProfissional || "").trim();
  const data = normalizeDate(params.data);
  const horaInicio = normalizeTimeString(params.horaInicio);
  const observacoes = String(params.observacoes || "").trim() || null;

  if (!idSalao || !idConta || !idServico || !idProfissional || !data) {
    return { ok: false, error: "Preencha servico, profissional, data e horario." };
  }

  if (isPastDateTime(data, horaInicio)) {
    return {
      ok: false,
      error: "Escolha um horario futuro para criar o agendamento.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salao nao esta publicado no app cliente agora.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_book_appointment",
    actorId: idConta,
    idSalao,
    run: async (supabaseAdmin) => {
      const vinculoConta = await ensureClienteContaVinculadaAoSalao({
        idConta,
        idSalao,
      });

      if (!vinculoConta.ok) {
        return vinculoConta;
      }

      const idCliente = vinculoConta.idCliente;

      const [clienteResult, bookingContext] = await Promise.all([
        supabaseAdmin
          .from("clientes")
          .select("id, id_salao, status")
          .eq("id", idCliente)
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
        loadBookingBaseContext({
          supabaseAdmin,
          idSalao,
          idServico,
          idProfissional,
        }),
      ]);

      if (
        clienteResult.error ||
        !clienteResult.data?.id ||
        String(clienteResult.data.status || "").toLowerCase() !== "ativo"
      ) {
        return {
          ok: false,
          error: "Sua conta de cliente nao esta apta para agendar.",
        };
      }

      if (!bookingContext.ok) {
        return bookingContext;
      }

      const { config, profissional, duracao } = bookingContext;
      const horaFim = addDurationToTime(horaInicio, duracao);

      if (!ensureDiaFuncionamento({ config, dateString: data })) {
        return {
          ok: false,
          error: "Este dia nao esta disponivel para agendamento no salao.",
        };
      }

      const range = validateAgendaTimeRange({
        config,
        profissionais: [profissional],
        getProfessionalAutoBloqueiosFn: () => [],
        profissionalId: profissional.id,
        date: data,
        horaInicio,
        horaFim,
      });

      if (!range.ok) {
        return { ok: false, error: range.message };
      }

      const [{ data: bloqueios, error: bloqueiosError }, { data: agendamentos, error: agendamentosError }] =
        await Promise.all([
          supabaseAdmin
            .from("agenda_bloqueios")
            .select(
              "id, id_salao, profissional_id, data, hora_inicio, hora_fim, motivo"
            )
            .eq("id_salao", idSalao)
            .eq("profissional_id", idProfissional)
            .eq("data", data),
          supabaseAdmin
            .from("agendamentos")
            .select("id, hora_inicio, hora_fim, status")
            .eq("id_salao", idSalao)
            .eq("profissional_id", idProfissional)
            .eq("data", data)
            .neq("status", "cancelado"),
        ]);

      if (bloqueiosError || agendamentosError) {
        return {
          ok: false,
          error: "Nao foi possivel validar a disponibilidade desse horario.",
        };
      }

      const autoBloqueios = mergeBloqueios(
        buildPausasBloqueiosDoProfissional({
          idSalao,
          profissionalId: idProfissional,
          date: data,
          pausas: profissional.pausas,
        }),
        buildForaExpedienteBloqueiosDoProfissional({
          idSalao,
          profissionalId: idProfissional,
          date: data,
          agendaInicio: config.hora_abertura,
          agendaFim: config.hora_fechamento,
          diasTrabalho: profissional.dias_trabalho,
        })
      );

      const conflitoBloqueio = mergeBloqueios(
        ((bloqueios || []) as Array<Record<string, unknown>>).map((item) => ({
          id: String(item.id || ""),
          id_salao: String(item.id_salao || idSalao),
          profissional_id: String(item.profissional_id || idProfissional),
          data: String(item.data || data),
          hora_inicio: normalizeTimeString(String(item.hora_inicio || "")),
          hora_fim: normalizeTimeString(String(item.hora_fim || "")),
          motivo: String(item.motivo || "").trim() || null,
        })),
        autoBloqueios
      ).some((item) =>
        overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );

      if (conflitoBloqueio) {
        return {
          ok: false,
          error: "Este horario esta bloqueado para o profissional escolhido.",
        };
      }

      const conflitoAgendamento = hasAppointmentConflictWithBuffer({
        horaInicio,
        horaFim,
        agendamentos: (agendamentos || []) as Array<Record<string, unknown>>,
        bufferMinutes: CLIENT_BOOKING_BUFFER_MINUTES,
      });

      if (conflitoAgendamento) {
        return {
          ok: false,
          error: "Este horario ja foi ocupado. Escolha outro horario.",
        };
      }

      const { error: insertError } = await supabaseAdmin
        .from("agendamentos")
        .insert({
          id_salao: idSalao,
          cliente_id: idCliente,
          profissional_id: idProfissional,
          servico_id: idServico,
          data,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          duracao_minutos: duracao,
          observacoes,
          status: "pendente",
          origem: "app_cliente",
        });

      if (insertError) {
        return {
          ok: false,
          error: "Nao foi possivel salvar seu agendamento agora.",
        };
      }

      return {
        ok: true,
        message:
          "Agendamento criado com sucesso. O salao ja pode confirmar seu horario.",
      };
    },
  });
}

export async function getClienteAppBookingAvailability(params: {
  idSalao: string;
  idServico: string;
  idProfissional: string;
}): Promise<ClienteAppAvailabilityResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idServico = String(params.idServico || "").trim();
  const idProfissional = String(params.idProfissional || "").trim();

  if (!idSalao || !idServico || !idProfissional) {
    return {
      ok: false,
      error: "Escolha servico e profissional para ver os horarios disponiveis.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salao nao esta publicado no app cliente agora.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_load_availability",
    actorId: idProfissional,
    idSalao,
    run: async (supabaseAdmin) => {
      const bookingContext = await loadBookingBaseContext({
        supabaseAdmin,
        idSalao,
        idServico,
        idProfissional,
      });

      if (!bookingContext.ok) {
        return bookingContext;
      }

      const { config, profissional, duracao } = bookingContext;
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + CLIENT_BOOKING_LOOKAHEAD_DAYS - 1);

      const dateFrom = formatDateString(startDate);
      const dateTo = formatDateString(endDate);

      const [{ data: bloqueios, error: bloqueiosError }, { data: agendamentos, error: agendamentosError }] =
        await Promise.all([
          supabaseAdmin
            .from("agenda_bloqueios")
            .select(
              "id, id_salao, profissional_id, data, hora_inicio, hora_fim, motivo"
            )
            .eq("id_salao", idSalao)
            .eq("profissional_id", idProfissional)
            .gte("data", dateFrom)
            .lte("data", dateTo),
          supabaseAdmin
            .from("agendamentos")
            .select("id, data, hora_inicio, hora_fim, status")
            .eq("id_salao", idSalao)
            .eq("profissional_id", idProfissional)
            .gte("data", dateFrom)
            .lte("data", dateTo)
            .neq("status", "cancelado"),
        ]);

      if (bloqueiosError || agendamentosError) {
        return {
          ok: false,
          error: "Nao foi possivel carregar a disponibilidade agora.",
        };
      }

      const bloqueiosByDate = new Map<string, Array<Record<string, unknown>>>();
      for (const item of ((bloqueios || []) as Array<Record<string, unknown>>)) {
        const date = String(item.data || "").trim();
        if (!date) continue;
        const list = bloqueiosByDate.get(date) || [];
        list.push(item);
        bloqueiosByDate.set(date, list);
      }

      const agendamentosByDate = new Map<string, Array<Record<string, unknown>>>();
      for (const item of ((agendamentos || []) as Array<Record<string, unknown>>)) {
        const date = String(item.data || "").trim();
        if (!date) continue;
        const list = agendamentosByDate.get(date) || [];
        list.push(item);
        agendamentosByDate.set(date, list);
      }

      const dias: ClienteAppAvailabilityDay[] = [];

      for (let offset = 0; offset < CLIENT_BOOKING_LOOKAHEAD_DAYS; offset += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + offset);
        const dateString = formatDateString(date);

        const horarios = buildDisponibilidadeDia({
          data: dateString,
          config,
          profissional,
          duracao,
          bloqueios: bloqueiosByDate.get(dateString) || [],
          agendamentos: agendamentosByDate.get(dateString) || [],
        });

        if (horarios.length) {
          dias.push({
            data: dateString,
            rotulo: buildClientDateLabel(dateString),
            horarios,
          });
        }
      }

      await warmClientAppNextSlotCache({
        supabaseAdmin,
        idSalao,
        idServico,
        idProfissional,
        dias,
      });

      return {
        ok: true,
        intervaloMinutos: config.intervalo_minutos,
        bufferMinutos: CLIENT_BOOKING_BUFFER_MINUTES,
        duracaoMinutos: duracao,
        dias,
      };
    },
  });
}

export async function cancelClienteAppAppointment(
  params: ClienteCancelParams
): Promise<ClienteAppActionResult> {
  const idConta = String(params.idConta || "").trim();
  const idAgendamento = String(params.idAgendamento || "").trim();

  if (!idConta || !idAgendamento) {
    return { ok: false, error: "Agendamento invalido para cancelamento." };
  }

  return runAdminOperation({
    action: "cliente_app_cancel_appointment",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const ownership = await loadOwnedAppointment({
        supabaseAdmin,
        idConta,
        idAgendamento,
      });

      if (!ownership) {
        return { ok: false, error: "Agendamento nao encontrado." };
      }

      const status = ownership.status.toLowerCase();
      if (status === "cancelado") {
        return { ok: false, error: "Este agendamento ja foi cancelado." };
      }

      if (status === "atendido" || status === "aguardando_pagamento") {
        return {
          ok: false,
          error:
            "Esse atendimento ja aconteceu e nao pode mais ser cancelado pelo app.",
        };
      }

      if (ownership.idComanda) {
        await cancelarAgendamentoComComanda({
          supabase: supabaseAdmin,
          idSalao: ownership.idSalao,
          idAgendamento,
        });
      } else {
        const { error: updateError } = await supabaseAdmin
          .from("agendamentos")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", ownership.idSalao)
          .eq("cliente_id", ownership.idCliente);

        if (updateError) {
          return {
            ok: false,
            error: "Nao foi possivel cancelar o agendamento agora.",
          };
        }
      }

      return {
        ok: true,
        message: "Agendamento cancelado com sucesso.",
      };
    },
  });
}

export async function reviewClienteAppAppointment(
  params: ClienteReviewParams
): Promise<ClienteAppActionResult> {
  const idConta = String(params.idConta || "").trim();
  const idAgendamento = String(params.idAgendamento || "").trim();
  const nota = Number(params.nota || 0);
  const comentario = String(params.comentario || "").trim() || null;

  if (!idConta || !idAgendamento) {
    return { ok: false, error: "Nao foi possivel identificar o atendimento." };
  }

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return { ok: false, error: "Escolha uma nota de 1 a 5 para avaliar." };
  }

  return runAdminOperation({
    action: "cliente_app_review_appointment",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const ownership = await loadOwnedAppointment({
        supabaseAdmin,
        idConta,
        idAgendamento,
      });

      if (!ownership) {
        return { ok: false, error: "Atendimento nao encontrado para avaliacao." };
      }

      const status = ownership.status.toLowerCase();
      if (status !== "atendido" && status !== "aguardando_pagamento") {
        return {
          ok: false,
          error: "A avaliacao so pode ser enviada depois do atendimento.",
        };
      }

      const { data: existingReview, error: existingReviewError } =
        await (supabaseAdmin as any)
          .from("clientes_avaliacoes")
          .select("id")
          .eq("id_cliente", ownership.idCliente)
          .eq("id_salao", ownership.idSalao)
          .eq("id_agendamento", idAgendamento)
          .limit(1)
          .maybeSingle();

      if (existingReviewError) {
        return {
          ok: false,
          error: "Nao foi possivel validar sua avaliacao agora.",
        };
      }

      const reviewMutation = existingReview?.id
        ? await (supabaseAdmin as any)
            .from("clientes_avaliacoes")
            .update({
              nota,
              comentario,
            })
            .eq("id", existingReview.id)
        : await (supabaseAdmin as any)
            .from("clientes_avaliacoes")
            .insert({
              id_cliente: ownership.idCliente,
              id_salao: ownership.idSalao,
              id_agendamento: idAgendamento,
              nota,
              comentario,
            });

      if (reviewMutation.error) {
        return {
          ok: false,
          error: "Nao foi possivel salvar sua avaliacao agora.",
        };
      }

      return {
        ok: true,
        message: "Avaliacao enviada com sucesso.",
      };
    },
  });
}
