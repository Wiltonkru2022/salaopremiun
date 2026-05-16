import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";
import { notifySalonAboutClientBooking } from "@/lib/push-notifications";
import { hasBlockedReviewLanguage } from "@/lib/content-moderation";
import {
  notifyAppointmentCanceled,
  notifyAppointmentRescheduled,
  notifyReviewReceived,
  queueNotificationJob,
  scheduleAppointmentReminderNotifications,
} from "@/lib/notification-jobs";
import { ensureClienteContaVinculadaAoSalao } from "@/app/services/cliente-app/auth";
import { notifyWaitlistAboutReleasedSlot } from "@/lib/client-app/waitlist";
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
const CLIENT_BOOKING_LOOKAHEAD_DAYS = 45;

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
  adicionaisIds?: string[] | null;
  codigoCupom?: string | null;
};

type ClienteCancelParams = {
  idConta: string;
  idAgendamento: string;
};

type ClienteConfirmParams = ClienteCancelParams;

type ClienteWaitlistParams = {
  idConta: string;
  idSalao: string;
  idServico: string;
  idProfissional: string;
  dataPreferida?: string | null;
};

type ClienteRescheduleParams = ClienteCancelParams & {
  data: string;
  horaInicio: string;
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
  idProfissional: string | null;
  idServico: string | null;
  data: string | null;
  horaInicio: string | null;
  horaFim: string | null;
  status: string;
  idComanda: string | null;
  clienteNome: string | null;
  profissionalNome: string | null;
  servicoNome: string | null;
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
  ignoreAgendamentoId?: string | null;
}) {
  return params.agendamentos.some((item) => {
    if (
      params.ignoreAgendamentoId &&
      String(item.id || "") === params.ignoreAgendamentoId
    ) {
      return false;
    }

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
          "id, id_salao, nome, ativo, preco, preco_padrao, duracao, duracao_minutos, descricao, app_cliente_visivel"
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
    return { ok: false as const, error: "A agenda deste salão ainda não está configurada." };
  }

  if (profissionalResult.error || !profissionalResult.data?.id) {
    return { ok: false as const, error: "Profissional não encontrado." };
  }

  if (
    !profissionalResult.data.app_cliente_visivel ||
    profissionalResult.data.eh_assistente === true ||
    profissionalResult.data.ativo === false
  ) {
    return {
      ok: false as const,
      error: "Este profissional não está disponível no app cliente.",
    };
  }

  if (servicoResult.error || !servicoResult.data?.id) {
    return { ok: false as const, error: "Serviço não encontrado." };
  }

  if (
    !servicoResult.data.app_cliente_visivel ||
    servicoResult.data.ativo === false
  ) {
    return {
      ok: false as const,
      error: "Este serviço não está disponível no app cliente.",
    };
  }

  if (vinculoResult.error || !vinculoResult.data?.id) {
    return {
      ok: false as const,
      error: "Este serviço não está vinculado ao profissional escolhido.",
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
    servicoNome: String(servicoResult.data.nome || "").trim() || "Serviço",
    servicoPreco:
      Number(servicoResult.data.preco_padrao ?? servicoResult.data.preco ?? 0) || 0,
  };
}

function calcularDescontoCupom(params: {
  tipo: string;
  valor: number;
  subtotal: number;
}) {
  if (params.subtotal <= 0 || params.valor <= 0) return 0;
  const desconto =
    params.tipo === "valor_fixo"
      ? params.valor
      : (params.subtotal * params.valor) / 100;
  return Math.max(0, Math.min(params.subtotal, Number(desconto.toFixed(2))));
}

async function validarCupomAgendamento(params: {
  supabaseAdmin: any;
  idSalao: string;
  idCliente: string;
  clienteAppContaId: string;
  codigoCupom: string;
  subtotal: number;
  idServico: string;
  data: string;
}) {
  if (!params.codigoCupom) {
    return { cupom: null as Record<string, unknown> | null, desconto: 0, erro: null as string | null };
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: cupom, error } = await (params.supabaseAdmin as any)
    .from("cupons_salao")
    .select(
      "id, codigo, nome, tipo_desconto, valor_desconto, valor_minimo, limite_uso_total, limite_uso_cliente, limite_uso_dia, limite_por_telefone_email, publico_tipo, valido_de, valido_ate, ativo, requer_resgate, status_campanha"
    )
    .eq("id_salao", params.idSalao)
    .eq("codigo", params.codigoCupom)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error || !cupom?.id) {
    return { cupom: null, desconto: 0, erro: "Cupom não encontrado ou inativo." };
  }

  if (cupom.valido_de && String(cupom.valido_de) > hoje) {
    return { cupom: null, desconto: 0, erro: "Este cupom ainda não está válido." };
  }

  if (cupom.valido_ate && String(cupom.valido_ate) < hoje) {
    return { cupom: null, desconto: 0, erro: "Este cupom expirou." };
  }

  if (String((cupom as any).status_campanha || "ativa") !== "ativa") {
    return { cupom: null, desconto: 0, erro: "Essa campanha nao esta mais disponivel." };
  }

  const valorMinimo = Number(cupom.valor_minimo || 0);
  if (valorMinimo > 0 && params.subtotal < valorMinimo) {
    return { cupom: null, desconto: 0, erro: "Este cupom exige um valor mínimo maior." };
  }

  const [{ count: totalUsos }, { count: usosCliente }] = await Promise.all([
    (params.supabaseAdmin as any)
      .from("cupom_salao_usos")
      .select("id", { count: "exact", head: true })
      .eq("id_cupom", cupom.id),
    (params.supabaseAdmin as any)
      .from("cupom_salao_usos")
      .select("id", { count: "exact", head: true })
      .eq("id_cupom", cupom.id)
      .eq("id_cliente", params.idCliente),
  ]);

  if (cupom.limite_uso_total && Number(totalUsos || 0) >= Number(cupom.limite_uso_total)) {
    return { cupom: null, desconto: 0, erro: "O limite de uso deste cupom acabou." };
  }

  if (cupom.limite_uso_cliente && Number(usosCliente || 0) >= Number(cupom.limite_uso_cliente)) {
    return { cupom: null, desconto: 0, erro: "Você já usou este cupom." };
  }

  const limiteDia = Number(cupom.limite_uso_dia || 0);
  if (limiteDia > 0) {
    const { count: usosDia } = await (params.supabaseAdmin as any)
      .from("cupom_salao_usos")
      .select("id", { count: "exact", head: true })
      .eq("id_cupom", cupom.id)
      .eq("id_salao", params.idSalao)
      .eq("metadata->>data", params.data);

    if (Number(usosDia || 0) >= limiteDia) {
      return {
        cupom: null,
        desconto: 0,
        erro: "O limite desta campanha para esse dia acabou.",
      };
    }
  }

  if (cupom.limite_por_telefone_email !== false) {
    const { data: contaCupom } = await (params.supabaseAdmin as any)
      .from("clientes_app_auth")
      .select("email, telefone")
      .eq("id", params.clienteAppContaId)
      .limit(1)
      .maybeSingle();
    const email = String(contaCupom?.email || "").trim().toLowerCase();
    const telefone = String(contaCupom?.telefone || "").replace(/\D/g, "");

    if (email || telefone) {
      const filtros = [
        email ? `metadata->>email.eq.${email}` : "",
        telefone ? `metadata->>telefone.eq.${telefone}` : "",
      ]
        .filter(Boolean)
        .join(",");
      const { data: usosMesmoContato } = await (params.supabaseAdmin as any)
        .from("cupom_salao_usos")
        .select("id")
        .eq("id_cupom", cupom.id)
        .eq("id_salao", params.idSalao)
        .or(filtros)
        .limit(1);

      if (usosMesmoContato?.length) {
        return {
          cupom: null,
          desconto: 0,
          erro: "Este contato ja usou esta campanha.",
        };
      }
    }
  }

  const publicoTipo = String(cupom.publico_tipo || "link");
  if (publicoTipo === "clientes_especificos") {
    const { data: clientePermitido } = await (params.supabaseAdmin as any)
      .from("cupom_salao_clientes")
      .select("id")
      .eq("id_cupom", cupom.id)
      .eq("id_salao", params.idSalao)
      .eq("id_cliente", params.idCliente)
      .limit(1)
      .maybeSingle();

    if (!clientePermitido?.id) {
      return {
        cupom: null,
        desconto: 0,
        erro: "Essa campanha esta liberada apenas para clientes selecionados.",
      };
    }
  }

  if (publicoTipo === "novos_clientes") {
    const { count: atendimentosAnteriores } = await (params.supabaseAdmin as any)
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", params.idSalao)
      .eq("cliente_id", params.idCliente)
      .neq("status", "cancelado");

    if (Number(atendimentosAnteriores || 0) > 0) {
      return {
        cupom: null,
        desconto: 0,
        erro: "Essa campanha e exclusiva para novos clientes.",
      };
    }
  }

  if (cupom.requer_resgate !== false) {
    const { data: resgate } = await (params.supabaseAdmin as any)
      .from("cupom_salao_resgates")
      .select("id")
      .eq("id_cupom", cupom.id)
      .eq("cliente_app_conta_id", params.clienteAppContaId)
      .eq("status", "resgatado")
      .limit(1)
      .maybeSingle();

    if (!resgate?.id) {
      return {
        cupom: null,
        desconto: 0,
        erro: "Resgate este cupom pelo link enviado pelo salao antes de usar.",
      };
    }
  }

  const { data: servicosCampanha } = await (params.supabaseAdmin as any)
    .from("cupom_salao_servicos")
    .select("id_servico, tipo_beneficio, valor_beneficio, limite_uso_servico")
    .eq("id_cupom", cupom.id)
    .eq("id_salao", params.idSalao)
    .limit(200);

  let desconto = calcularDescontoCupom({
    tipo: String(cupom.tipo_desconto || "percentual"),
    valor: Number(cupom.valor_desconto || 0),
    subtotal: params.subtotal,
  });

  if (servicosCampanha?.length) {
    const servicoCupom = (servicosCampanha as Array<Record<string, unknown>>).find(
      (item) => String(item.id_servico || "") === params.idServico
    );
    if (!servicoCupom) {
      return {
        cupom: null,
        desconto: 0,
        erro: "Essa campanha nao esta disponivel para o servico escolhido.",
      };
    }

    const limiteServico = Number(servicoCupom.limite_uso_servico || 0);
    if (limiteServico > 0) {
      const { count: usosServico } = await (params.supabaseAdmin as any)
        .from("cupom_salao_usos")
        .select("id", { count: "exact", head: true })
        .eq("id_cupom", cupom.id)
        .eq("id_salao", params.idSalao)
        .eq("metadata->>id_servico", params.idServico);
      if (Number(usosServico || 0) >= limiteServico) {
        return {
          cupom: null,
          desconto: 0,
          erro: "O limite desta campanha para esse servico acabou.",
        };
      }
    }

    const tipoBeneficio = String(servicoCupom.tipo_beneficio || "");
    const valorBeneficio = Number(servicoCupom.valor_beneficio || 0);
    if (tipoBeneficio === "preco_fixo") {
      desconto = Math.max(0, params.subtotal - valorBeneficio);
    } else if (tipoBeneficio === "desconto_valor") {
      desconto = Math.min(params.subtotal, valorBeneficio);
    } else if (tipoBeneficio === "desconto_percentual") {
      desconto = calcularDescontoCupom({
        tipo: "percentual",
        valor: valorBeneficio,
        subtotal: params.subtotal,
      });
    }
  }

  return {
    cupom: cupom as Record<string, unknown>,
    desconto,
    erro: null,
  };
}

function buildDisponibilidadeDia(params: {
  data: string;
  config: ConfigSalao;
  profissional: Profissional;
  duracao: number;
  bloqueios: Array<Record<string, unknown>>;
  agendamentos: Array<Record<string, unknown>>;
  ignoreAgendamentoId?: string | null;
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
        ignoreAgendamentoId: params.ignoreAgendamentoId,
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
    .select(
      "id, id_salao, cliente_id, profissional_id, servico_id, id_comanda, status, data, hora_inicio, hora_fim, clientes(nome), profissionais(nome, nome_exibicao), servicos(nome)"
    )
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
    idProfissional: String(agendamento.profissional_id || "").trim() || null,
    idServico: String(agendamento.servico_id || "").trim() || null,
    data: String(agendamento.data || "").trim() || null,
    horaInicio: String(agendamento.hora_inicio || "").trim() || null,
    horaFim: String(agendamento.hora_fim || "").trim() || null,
    status: String(agendamento.status || "").trim() || "pendente",
    idComanda: String(agendamento.id_comanda || "").trim() || null,
    clienteNome:
      String(
        Array.isArray(agendamento.clientes)
          ? agendamento.clientes[0]?.nome
          : agendamento.clientes?.nome || ""
      ).trim() || null,
    profissionalNome:
      String(
        Array.isArray(agendamento.profissionais)
          ? agendamento.profissionais[0]?.nome_exibicao ||
              agendamento.profissionais[0]?.nome
          : agendamento.profissionais?.nome_exibicao ||
              agendamento.profissionais?.nome ||
              ""
      ).trim() || null,
    servicoNome:
      String(
        Array.isArray(agendamento.servicos)
          ? agendamento.servicos[0]?.nome
          : agendamento.servicos?.nome || ""
      ).trim() || null,
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
  const codigoCupom = String(params.codigoCupom || "").trim().toUpperCase();
  const adicionaisIds = Array.from(
    new Set(
      (params.adicionaisIds || [])
        .map((item) => String(item || "").trim())
        .filter((item) => item && item !== idServico)
    )
  ).slice(0, 3);

  if (!idSalao || !idConta || !idServico || !idProfissional || !data) {
    return { ok: false, error: "Preencha serviço, profissional, data e horário." };
  }

  if (isPastDateTime(data, horaInicio)) {
    return {
      ok: false,
      error: "Escolha um horário futuro para criar o agendamento.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salão não está publicado no app cliente agora.",
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
          .select("id, id_salao, nome, status, email, telefone")
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
          error: "Sua conta de cliente não está apta para agendar.",
        };
      }

      if (!bookingContext.ok) {
        return bookingContext;
      }

      const { config, profissional, duracao, servicoNome, servicoPreco } = bookingContext;
      const horaFim = addDurationToTime(horaInicio, duracao);

      if (!ensureDiaFuncionamento({ config, dateString: data })) {
        return {
          ok: false,
          error: "Este dia não está disponível para agendamento no salão.",
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
          error: "Não foi possível validar a disponibilidade desse horário.",
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
          error: "Este horário está bloqueado para o profissional escolhido.",
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
          error: "Este horário já foi ocupado. Escolha outro horário.",
        };
      }

      let observacoesComAdicionais = observacoes;
      let adicionaisRowsSalvos: Array<Record<string, unknown>> = [];

      if (adicionaisIds.length) {
        const { data: adicionaisRows } = await (supabaseAdmin as any)
          .from("servicos")
          .select("id, nome, preco, preco_padrao")
          .eq("id_salao", idSalao)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .in("id", adicionaisIds)
          .limit(3);

        adicionaisRowsSalvos = ((adicionaisRows || []) as Array<Record<string, unknown>>);
        const adicionaisTexto = adicionaisRowsSalvos
          .map((item) => {
            const nome = String(item.nome || "").trim();
            const preco = Number(item.preco_padrao ?? item.preco ?? Number.NaN);
            const precoLabel = Number.isFinite(preco)
              ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(preco)
              : "valor sob consulta";
            return nome ? `${nome} (${precoLabel})` : null;
          })
          .filter(Boolean)
          .join(", ");

        if (adicionaisTexto) {
          observacoesComAdicionais = [
            observacoes,
            `Interesse em adicionais: ${adicionaisTexto}.`,
          ]
            .filter(Boolean)
            .join("\n\n");
        }
      }

      const subtotalEstimado =
        Number(servicoPreco || 0) +
        adicionaisRowsSalvos.reduce(
          (sum, item) => sum + Number(item.preco_padrao ?? item.preco ?? 0),
          0
        );
      const cupomResult = await validarCupomAgendamento({
        supabaseAdmin,
        idSalao,
        idCliente,
        clienteAppContaId: idConta,
        codigoCupom,
        subtotal: subtotalEstimado,
        idServico,
        data,
      });

      if (cupomResult.erro) {
        return { ok: false, error: cupomResult.erro };
      }

      if (cupomResult.cupom?.id && cupomResult.desconto > 0) {
        observacoesComAdicionais = [
          observacoesComAdicionais,
          `Cupom aplicado: ${codigoCupom} (-${cupomResult.desconto.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}).`,
        ]
          .filter(Boolean)
          .join("\n\n");
      }

      const { data: insertedAppointment, error: insertError } = await supabaseAdmin
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
          observacoes: observacoesComAdicionais,
          id_cupom_salao: cupomResult.cupom?.id || null,
          codigo_cupom: cupomResult.cupom?.id ? codigoCupom : null,
          desconto_cupom_valor: cupomResult.desconto,
          status: "pendente",
          origem: "app_cliente",
        })
        .select("id")
        .maybeSingle();

      if (insertError || !insertedAppointment?.id) {
        return {
          ok: false,
          error: "Não foi possível salvar seu agendamento agora.",
        };
      }

      const idAgendamento = String(insertedAppointment.id);

      if (adicionaisRowsSalvos.length) {
        await (supabaseAdmin as any).from("agendamento_adicionais").insert(
          adicionaisRowsSalvos.map((item) => ({
            id_salao: idSalao,
            id_agendamento: idAgendamento,
            id_servico: item.id,
            nome: String(item.nome || "Adicional").trim(),
            preco: Number(item.preco_padrao ?? item.preco ?? 0) || null,
            status: "sugerido",
            origem: "app_cliente_upsell",
          }))
        );
      }

      if (cupomResult.cupom?.id && cupomResult.desconto > 0) {
        await (supabaseAdmin as any).from("cupom_salao_usos").insert({
          id_salao: idSalao,
          id_cupom: cupomResult.cupom.id,
          id_cliente: idCliente,
          cliente_app_conta_id: idConta,
          id_agendamento: idAgendamento,
          codigo: codigoCupom,
          valor_desconto: cupomResult.desconto,
          status: "reservado",
          metadata: {
            origem: "app_cliente",
            id_servico: idServico,
            subtotal: subtotalEstimado,
            data,
            telefone: String(clienteResult.data.telefone || "").replace(/\D/g, "") || null,
            email: String(clienteResult.data.email || "").trim().toLowerCase() || null,
          },
        });

        await (supabaseAdmin as any).from("campanha_eventos").insert({
          id_salao: idSalao,
          id_cupom: cupomResult.cupom.id,
          cliente_app_conta_id: idConta,
          id_cliente: idCliente,
          tipo: "agendamento",
          metadata: { id_agendamento: idAgendamento, id_servico: idServico },
        });

        await (supabaseAdmin as any)
          .from("cupom_salao_resgates")
          .update({
            status: "usado",
            usado_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id_cupom", cupomResult.cupom.id)
          .eq("cliente_app_conta_id", idConta);
      }

      await notifySalonAboutClientBooking({
        idAgendamento,
        idSalao,
        idProfissional,
        clienteNome:
          String(clienteResult.data.nome || "").trim() || "Cliente do app",
        servicoNome,
        data,
        horaInicio,
      });

      await scheduleAppointmentReminderNotifications({
        idAgendamento,
        idSalao,
      });

      return {
        ok: true,
        message:
          "Pedido enviado. O salão vai confirmar seu horário.",
      };
    },
  });
}

export async function getClienteAppBookingAvailability(params: {
  idSalao: string;
  idServico: string;
  idProfissional: string;
  ignoreAgendamentoId?: string | null;
  startDate?: string | null;
}): Promise<ClienteAppAvailabilityResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idServico = String(params.idServico || "").trim();
  const idProfissional = String(params.idProfissional || "").trim();

  if (!idSalao || !idServico || !idProfissional) {
    return {
      ok: false,
      error: "Escolha serviço e profissional para ver os horários disponíveis.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salão não está publicado no app cliente agora.",
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
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const requestedStart = params.startDate
        ? new Date(`${String(params.startDate).slice(0, 10)}T12:00:00`)
        : todayStart;
      const safeRequestedStart = Number.isNaN(requestedStart.getTime())
        ? todayStart
        : new Date(
            requestedStart.getFullYear(),
            requestedStart.getMonth(),
            requestedStart.getDate()
          );
      const startDate =
        safeRequestedStart < todayStart ? todayStart : safeRequestedStart;
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
          error: "Não foi possível carregar a disponibilidade agora.",
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
          ignoreAgendamentoId: params.ignoreAgendamentoId || null,
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
    return { ok: false, error: "Agendamento inválido para cancelamento." };
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
        return { ok: false, error: "Agendamento não encontrado." };
      }

      const status = ownership.status.toLowerCase();
      if (status === "cancelado") {
        return { ok: false, error: "Este agendamento já foi cancelado." };
      }

      if (status === "atendido" || status === "aguardando_pagamento") {
        return {
          ok: false,
          error:
            "Esse atendimento já aconteceu e não pode mais ser cancelado pelo app.",
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
            error: "Não foi possível cancelar o agendamento agora.",
          };
        }
      }

      try {
        await notifyAppointmentCanceled({
          idSalao: ownership.idSalao,
          idAgendamento,
          idCliente: ownership.idCliente,
          idProfissional: ownership.idProfissional,
          clienteNome: ownership.clienteNome,
          profissionalNome: ownership.profissionalNome,
          servicoNome: ownership.servicoNome,
          data: ownership.data,
          horaInicio: ownership.horaInicio,
          actor: "cliente",
        });
      } catch {
        // Cancelamento do cliente nao deve depender de push.
      }

      try {
        await notifyWaitlistAboutReleasedSlot({
          supabaseAdmin,
          releasedSlot: {
            idSalao: ownership.idSalao,
            idServico: ownership.idServico,
            idProfissional: ownership.idProfissional,
            data: ownership.data,
            horaInicio: ownership.horaInicio,
            servicoNome: ownership.servicoNome,
          },
        });
      } catch {
        // A agenda deve ser liberada mesmo se a lista de espera falhar.
      }

      await (supabaseAdmin as any)
        .from("cupom_salao_usos")
        .update({
          status: "cancelado",
          updated_at: new Date().toISOString(),
        })
        .eq("id_salao", ownership.idSalao)
        .eq("id_agendamento", idAgendamento)
        .eq("status", "reservado");

      const { error: deleteError } = await supabaseAdmin
        .from("agendamentos")
        .delete()
        .eq("id", idAgendamento)
        .eq("id_salao", ownership.idSalao)
        .eq("cliente_id", ownership.idCliente);

      if (deleteError) {
        return {
          ok: false,
          error: "O agendamento foi cancelado, mas não foi possível liberar a agenda agora.",
        };
      }

      return {
        ok: true,
        message: "Agendamento cancelado com sucesso.",
      };
    },
  });
}

export async function confirmClienteAppAppointment(
  params: ClienteConfirmParams
): Promise<ClienteAppActionResult> {
  const idConta = String(params.idConta || "").trim();
  const idAgendamento = String(params.idAgendamento || "").trim();

  if (!idConta || !idAgendamento) {
    return { ok: false, error: "Agendamento inválido para confirmação." };
  }

  return runAdminOperation({
    action: "cliente_app_confirm_appointment",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const ownership = await loadOwnedAppointment({
        supabaseAdmin,
        idConta,
        idAgendamento,
      });

      if (!ownership) {
        return { ok: false, error: "Agendamento não encontrado." };
      }

      const status = ownership.status.toLowerCase();
      if (status === "cancelado") {
        return { ok: false, error: "Este agendamento foi cancelado." };
      }

      if (status === "atendido" || status === "aguardando_pagamento") {
        return {
          ok: false,
          error: "Esse atendimento já aconteceu.",
        };
      }

      const now = new Date().toISOString();
      const { error: updateError } = await (supabaseAdmin as any)
        .from("agendamentos")
        .update({
          status: status === "pendente" ? "confirmado" : ownership.status,
          cliente_confirmacao_status: "confirmado",
          cliente_confirmou_em: now,
          cliente_cancelou_em: null,
          updated_at: now,
        })
        .eq("id", idAgendamento)
        .eq("id_salao", ownership.idSalao)
        .eq("cliente_id", ownership.idCliente);

      if (updateError) {
        return {
          ok: false,
          error: "Não foi possível confirmar sua presença agora.",
        };
      }

      try {
        await queueNotificationJob({
          idSalao: ownership.idSalao,
          idCliente: ownership.idCliente,
          idProfissional: ownership.idProfissional,
          canal: "salao_painel",
          tipo: "cliente_confirmou_agendamento",
          titulo: "Cliente confirmou presença",
          mensagem: `${ownership.clienteNome || "Cliente"} confirmou ${ownership.servicoNome || "o atendimento"} para ${ownership.data || "a data marcada"} às ${String(ownership.horaInicio || "").slice(0, 5)}.`,
          url: `/agenda?agendamento=${idAgendamento}`,
          tag: `cliente-confirmou-${idAgendamento}`,
          idempotencyKey: `cliente-confirmou-${idAgendamento}`,
          metadata: {
            origem: "app_cliente",
            idAgendamento,
          },
        });
      } catch {
        // A confirmação do cliente não deve depender do push do salão.
      }

      return {
        ok: true,
        message: "Presença confirmada com sucesso.",
      };
    },
  });
}

export async function joinClienteAppWaitlist(
  params: ClienteWaitlistParams
): Promise<ClienteAppActionResult> {
  const idConta = String(params.idConta || "").trim();
  const idSalao = String(params.idSalao || "").trim();
  const idServico = String(params.idServico || "").trim();
  const idProfissional = String(params.idProfissional || "").trim();
  const dataPreferida = normalizeDate(String(params.dataPreferida || ""));

  if (!idConta || !idSalao || !idServico || !idProfissional) {
    return {
      ok: false,
      error: "Escolha serviço e profissional para entrar na lista de espera.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salão não está publicado no app cliente agora.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_join_waitlist",
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

      let existingQuery = (supabaseAdmin as any)
        .from("lista_espera_agendamentos")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("cliente_app_conta_id", idConta)
        .eq("id_servico", idServico)
        .eq("id_profissional", idProfissional)
        .eq("status", "ativo")
        .limit(1);

      existingQuery = dataPreferida
        ? existingQuery.eq("data_preferida", dataPreferida)
        : existingQuery.is("data_preferida", null);

      const { data: existingWaitlist } = await existingQuery.maybeSingle();
      if (existingWaitlist?.id) {
        return {
          ok: true,
          message: "Você já está na lista de espera para essa escolha.",
        };
      }

      const { error } = await (supabaseAdmin as any)
        .from("lista_espera_agendamentos")
        .insert({
          id_salao: idSalao,
          cliente_app_conta_id: idConta,
          id_cliente: vinculoConta.idCliente,
          id_servico: idServico,
          id_profissional: idProfissional,
          data_preferida: dataPreferida || null,
          status: "ativo",
          origem: "app_cliente",
        });

      if (error) {
        return {
          ok: false,
          error: "Não foi possível entrar na lista de espera agora.",
        };
      }

      return {
        ok: true,
        message: "Você entrou na lista de espera.",
      };
    },
  });
}

export async function rescheduleClienteAppAppointment(
  params: ClienteRescheduleParams
): Promise<ClienteAppActionResult> {
  const idConta = String(params.idConta || "").trim();
  const idAgendamento = String(params.idAgendamento || "").trim();
  const data = normalizeDate(params.data);
  const horaInicio = normalizeTimeString(params.horaInicio);

  if (!idConta || !idAgendamento || !data || !horaInicio) {
    return { ok: false, error: "Informe o novo dia e horário." };
  }

  if (isPastDateTime(data, horaInicio)) {
    return { ok: false, error: "Escolha um horário futuro para reagendar." };
  }

  return runAdminOperation({
    action: "cliente_app_reschedule_appointment",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const ownership = await loadOwnedAppointment({
        supabaseAdmin,
        idConta,
        idAgendamento,
      });

      if (!ownership) {
        return { ok: false, error: "Agendamento não encontrado." };
      }

      const status = ownership.status.toLowerCase();
      if (status !== "confirmado" && status !== "pendente") {
        return {
          ok: false,
          error: "Este agendamento não pode mais ser reagendado pelo app.",
        };
      }

      if (!ownership.idServico || !ownership.idProfissional) {
        return {
          ok: false,
          error: "Não foi possível identificar serviço e profissional.",
        };
      }

      const bookingContext = await loadBookingBaseContext({
        supabaseAdmin,
        idSalao: ownership.idSalao,
        idServico: ownership.idServico,
        idProfissional: ownership.idProfissional,
      });

      if (!bookingContext.ok) return bookingContext;

      const { config, profissional, duracao } = bookingContext;
      const horaFim = addDurationToTime(horaInicio, duracao);

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
            .select("id, id_salao, profissional_id, data, hora_inicio, hora_fim, motivo")
            .eq("id_salao", ownership.idSalao)
            .eq("profissional_id", ownership.idProfissional)
            .eq("data", data),
          supabaseAdmin
            .from("agendamentos")
            .select("id, hora_inicio, hora_fim, status")
            .eq("id_salao", ownership.idSalao)
            .eq("profissional_id", ownership.idProfissional)
            .eq("data", data)
            .neq("status", "cancelado"),
        ]);

      if (bloqueiosError || agendamentosError) {
        return {
          ok: false,
          error: "Não foi possível validar a disponibilidade desse horário.",
        };
      }

      const autoBloqueios = mergeBloqueios(
        buildPausasBloqueiosDoProfissional({
          idSalao: ownership.idSalao,
          profissionalId: ownership.idProfissional,
          date: data,
          pausas: profissional.pausas,
        }),
        buildForaExpedienteBloqueiosDoProfissional({
          idSalao: ownership.idSalao,
          profissionalId: ownership.idProfissional,
          date: data,
          agendaInicio: config.hora_abertura,
          agendaFim: config.hora_fechamento,
          diasTrabalho: profissional.dias_trabalho,
        })
      );

      const conflitoBloqueio = mergeBloqueios(
        ((bloqueios || []) as Array<Record<string, unknown>>).map((item) => ({
          id: String(item.id || ""),
          id_salao: String(item.id_salao || ownership.idSalao),
          profissional_id: String(item.profissional_id || ownership.idProfissional),
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
          error: "Este horário está bloqueado para o profissional escolhido.",
        };
      }

      const conflitoAgendamento = hasAppointmentConflictWithBuffer({
        horaInicio,
        horaFim,
        agendamentos: (agendamentos || []) as Array<Record<string, unknown>>,
        bufferMinutes: CLIENT_BOOKING_BUFFER_MINUTES,
        ignoreAgendamentoId: idAgendamento,
      });

      if (conflitoAgendamento) {
        return {
          ok: false,
          error: "Este horário já foi ocupado. Escolha outro horário.",
        };
      }

      const { error: updateError } = await supabaseAdmin
        .from("agendamentos")
        .update({
          data,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          duracao_minutos: duracao,
          status: "confirmado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", idAgendamento)
        .eq("id_salao", ownership.idSalao)
        .eq("cliente_id", ownership.idCliente);

      if (updateError) {
        return {
          ok: false,
          error: "Não foi possível reagendar agora.",
        };
      }

      try {
        await notifyAppointmentRescheduled({
          idAgendamento,
          idSalao: ownership.idSalao,
          actor: "cliente",
          previousDate: ownership.data,
          previousTime: ownership.horaInicio,
        });
      } catch {
        // Reagendamento salvo mesmo se push falhar.
      }

      try {
        await notifyWaitlistAboutReleasedSlot({
          supabaseAdmin,
          releasedSlot: {
            idSalao: ownership.idSalao,
            idServico: ownership.idServico,
            idProfissional: ownership.idProfissional,
            data: ownership.data,
            horaInicio: ownership.horaInicio,
            servicoNome: ownership.servicoNome,
          },
        });
      } catch {
        // Reagendamento salvo mesmo se a lista de espera falhar.
      }

      return {
        ok: true,
        message: "Agendamento reagendado com sucesso.",
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
    return { ok: false, error: "Não foi possível identificar o atendimento." };
  }

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return { ok: false, error: "Escolha uma nota de 1 a 5 para avaliar." };
  }

  if (comentario && hasBlockedReviewLanguage(comentario)) {
    return {
      ok: false,
      error: "Revise seu comentario para seguir as normas do app.",
    };
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
        return { ok: false, error: "Atendimento não encontrado para avaliação." };
      }

      const status = ownership.status.toLowerCase();
      if (status !== "atendido" && status !== "aguardando_pagamento") {
        return {
          ok: false,
          error: "A avaliação só pode ser enviada depois do atendimento.",
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
          error: "Não foi possível validar sua avaliação agora.",
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
          error: "Não foi possível salvar sua avaliação agora.",
        };
      }

      try {
        await notifyReviewReceived({
          idSalao: ownership.idSalao,
          idAgendamento,
          nota,
          comentario,
        });
      } catch {
        // Avaliacao salva mesmo se a notificacao do salao falhar.
      }

      return {
        ok: true,
        message: "Avaliação enviada com sucesso.",
      };
    },
  });
}
