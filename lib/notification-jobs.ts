import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendPushToRows,
  type PushAudience,
} from "@/lib/push-notifications";
import { loadSalonNotificationSettings } from "@/lib/salon-notification-settings";

type NotificationChannel = "cliente_app" | "profissional_app" | "salao_painel";
type NotificationStatus = "pendente" | "processando" | "enviada" | "falhou" | "cancelada";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationJobRow = {
  id: string;
  id_salao: string | null;
  id_cliente: string | null;
  id_profissional: string | null;
  cliente_app_conta_id: string | null;
  canal: NotificationChannel;
  tipo: string;
  titulo: string;
  mensagem: string;
  url: string | null;
  tag: string | null;
  status: NotificationStatus;
  enviar_em: string;
  tentativas: number | null;
  idempotency_key: string;
};

export type QueueNotificationJobParams = {
  idSalao?: string | null;
  idCliente?: string | null;
  idProfissional?: string | null;
  clienteAppContaId?: string | null;
  canal: NotificationChannel;
  tipo: string;
  titulo: string;
  mensagem: string;
  url?: string | null;
  tag?: string | null;
  enviarEm?: string | Date | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown> | null;
};

function toIsoDate(value?: string | Date | null) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function sanitizeId(value?: string | null) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function sanitizeText(value: string, fallback: string) {
  return String(value || "").trim() || fallback;
}

async function isClienteAppPushEnabled(clienteAppContaId?: string | null) {
  const id = sanitizeId(clienteAppContaId);
  if (!id) return false;

  const { data, error } = await (getSupabaseAdmin() as any)
    .from("clientes_app_auth")
    .select("notificacoes_ativas, notificacao_app_ativa")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    if (
      message.includes("notificacoes_ativas") ||
      message.includes("notificacao_app_ativa")
    ) {
      return true;
    }
    return false;
  }

  if (!data) return false;
  return data.notificacoes_ativas !== false && data.notificacao_app_ativa !== false;
}

async function isProfissionalAppPushEnabled(idProfissional?: string | null) {
  const id = sanitizeId(idProfissional);
  if (!id) return false;

  const { data, error } = await (getSupabaseAdmin() as any)
    .from("profissionais")
    .select("notificacoes_ativas, notificacao_app_ativa")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    if (
      message.includes("notificacoes_ativas") ||
      message.includes("notificacao_app_ativa")
    ) {
      return true;
    }
    return false;
  }

  if (!data) return false;
  return data.notificacoes_ativas !== false && data.notificacao_app_ativa !== false;
}

async function isNotificationTypeEnabled(params: {
  idSalao?: string | null;
  tipo: string;
}) {
  if (!params.idSalao) return true;

  try {
    const settings = await loadSalonNotificationSettings(params.idSalao);
    const tipo = String(params.tipo || "").toLowerCase();

    if (tipo === "agendamento_confirmado_cliente") return settings.clienteAgendamentoConfirmado;
    if (tipo === "lembrete_30min_cliente") return settings.clienteLembrete30min;
    if (tipo === "atendimento_finalizado_cliente") return settings.clienteAtendimentoFinalizado;
    if (tipo === "avaliar_atendimento") return settings.clienteAvaliarAtendimento;
    if (tipo === "reagendamento_cliente") return settings.clienteReagendamento;
    if (tipo === "cancelamento_cliente") return settings.clienteCancelamento;
    if (tipo === "lembrete_30min_profissional") return settings.profissionalLembrete30min;
    if (tipo === "atendimento_finalizado_profissional") return settings.profissionalAtendimentoFinalizado;
    if (tipo === "reagendamento_profissional") return settings.profissionalReagendamento;
    if (tipo === "cancelamento_profissional") return settings.profissionalCancelamento;
    if (tipo === "novo_agendamento_app_salao") return settings.salaoNovoAgendamentoApp;
    if (tipo === "cancelamento_cliente_salao") return settings.salaoCancelamentoCliente;
    if (tipo === "reagendamento_cliente_salao") return settings.salaoReagendamentoCliente;
    if (tipo === "avaliacao_ruim" || tipo === "avaliacao_recebida") return settings.salaoAvaliacoes;

    return true;
  } catch {
    return true;
  }
}

export async function queueNotificationJob(params: QueueNotificationJobParams) {
  const supabase = getSupabaseAdmin();
  const idempotencyKey = sanitizeText(params.idempotencyKey, "");
  if (!idempotencyKey) return { ok: false as const, error: "Chave da notificacao ausente." };

  const enabled = await isNotificationTypeEnabled({
    idSalao: params.idSalao,
    tipo: params.tipo,
  });
  if (!enabled) return { ok: true as const, skipped: true as const };

  const { error } = await (supabase as any)
    .from("notification_jobs")
    .upsert(
      {
        id_salao: sanitizeId(params.idSalao),
        id_cliente: sanitizeId(params.idCliente),
        id_profissional: sanitizeId(params.idProfissional),
        cliente_app_conta_id: sanitizeId(params.clienteAppContaId),
        canal: params.canal,
        tipo: sanitizeText(params.tipo, "notificacao"),
        titulo: sanitizeText(params.titulo, "SalaoPremium"),
        mensagem: sanitizeText(params.mensagem, "Voce tem uma nova notificacao."),
        url: sanitizeId(params.url),
        tag: sanitizeId(params.tag),
        status: "pendente",
        enviar_em: toIsoDate(params.enviarEm),
        idempotency_key: idempotencyKey,
        metadata: params.metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

async function findSubscriptionsForJob(job: NotificationJobRow) {
  const supabase = getSupabaseAdmin();
  let query = (supabase as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("ativo", true)
    .eq("audience", job.canal as PushAudience);

  if (job.canal === "cliente_app") {
    if (!job.cliente_app_conta_id) return [];
    const enabled = await isClienteAppPushEnabled(job.cliente_app_conta_id);
    if (!enabled) return [];
    query = query.eq("cliente_app_conta_id", job.cliente_app_conta_id);
  }

  if (job.canal === "profissional_app") {
    if (!job.id_salao || !job.id_profissional) return [];
    const enabled = await isProfissionalAppPushEnabled(job.id_profissional);
    if (!enabled) return [];
    query = query.eq("id_salao", job.id_salao).eq("id_profissional", job.id_profissional);
  }

  if (job.canal === "salao_painel") {
    if (!job.id_salao) return [];
    query = query.eq("id_salao", job.id_salao);
  }

  const { data, error } = await query.limit(1000);
  if (error || !data?.length) return [];
  return data as PushSubscriptionRow[];
}

async function markJob(
  id: string,
  status: NotificationStatus,
  extra?: Record<string, unknown>
) {
  await (getSupabaseAdmin() as any)
    .from("notification_jobs")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(extra || {}),
    })
    .eq("id", id);
}

export async function processPendingNotificationJobs(limit = 80) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from("notification_jobs")
    .select(
      "id, id_salao, id_cliente, id_profissional, cliente_app_conta_id, canal, tipo, titulo, mensagem, url, tag, status, enviar_em, tentativas, idempotency_key"
    )
    .eq("status", "pendente")
    .lte("enviar_em", now)
    .order("enviar_em", { ascending: true })
    .limit(limit);

  if (error) {
    const message = String(error.message || "");
    if (message.includes("notification_jobs") || message.includes("does not exist")) {
      return {
        processed: 0,
        sent: 0,
        failed: 0,
      };
    }

    throw new Error(error.message || "Erro ao carregar notificacoes pendentes.");
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const job of ((data || []) as NotificationJobRow[])) {
    const lock = await (supabase as any)
      .from("notification_jobs")
      .update({
        status: "processando",
        tentativas: Number(job.tentativas || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();

    if (lock.error || !lock.data?.id) continue;

    try {
      const rows = await findSubscriptionsForJob(job);
      const result = await sendPushToRows(rows, {
        title: job.titulo,
        body: job.mensagem,
        url: job.url || "/",
        tag: job.tag || job.idempotency_key,
      });

      await markJob(job.id, "enviada", {
        enviada_em: new Date().toISOString(),
        sent_count: result.sent,
        erro_texto: null,
      });
      processed += 1;
      sent += result.sent;
    } catch (error) {
      failed += 1;
      await markJob(job.id, "falhou", {
        erro_texto:
          error instanceof Error ? error.message : "Erro ao enviar notificacao.",
      });
    }
  }

  return {
    processed,
    sent,
    failed,
  };
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function appointmentDateTime(data?: string | null, hora?: string | null) {
  const date = String(data || "").slice(0, 10);
  const time = String(hora || "").slice(0, 5);
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAppointmentDate(data?: string | null, hora?: string | null) {
  const date = data
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(`${String(data).slice(0, 10)}T12:00:00`))
    : "data marcada";
  const time = String(hora || "").slice(0, 5);
  return time ? `${date} as ${time}` : date;
}

type AppointmentNotificationContext = {
  id: string;
  id_salao: string;
  cliente_id: string | null;
  profissional_id: string | null;
  data: string | null;
  hora_inicio: string | null;
  status: string | null;
  total?: number | null;
  clientes?: { nome?: string | null } | { nome?: string | null }[] | null;
  profissionais?: { nome?: string | null; nome_exibicao?: string | null } | { nome?: string | null; nome_exibicao?: string | null }[] | null;
  servicos?: { nome?: string | null } | { nome?: string | null }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value || null;
}

async function loadAppointmentContext(idAgendamento: string, idSalao: string) {
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("agendamentos")
    .select(
      "id, id_salao, cliente_id, profissional_id, data, hora_inicio, status, clientes(nome), profissionais(nome, nome_exibicao), servicos(nome)"
    )
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data as AppointmentNotificationContext;
}

async function findClienteAppContaId(params: {
  idSalao: string;
  idCliente?: string | null;
}) {
  if (!params.idCliente) return null;
  const { data } = await (getSupabaseAdmin() as any)
    .from("clientes_auth")
    .select("app_conta_id")
    .eq("id_salao", params.idSalao)
    .eq("id_cliente", params.idCliente)
    .eq("app_ativo", true)
    .not("app_conta_id", "is", null)
    .limit(1)
    .maybeSingle();

  return String(data?.app_conta_id || "").trim() || null;
}

export async function scheduleAppointmentReminderNotifications(params: {
  idAgendamento: string;
  idSalao: string;
}) {
  const agendamento = await loadAppointmentContext(params.idAgendamento, params.idSalao);
  if (!agendamento) return;
  if (!["confirmado", "em_atendimento"].includes(String(agendamento.status || "").toLowerCase())) return;

  const start = appointmentDateTime(agendamento.data, agendamento.hora_inicio);
  if (!start) return;
  const settings = await loadSalonNotificationSettings(params.idSalao);
  const minutosAntes = settings.lembreteMinutosAntes || 30;
  const enviarEm = addMinutes(start, -minutosAntes);
  if (enviarEm.getTime() <= Date.now()) return;

  const cliente = firstRelation(agendamento.clientes);
  const profissional = firstRelation(agendamento.profissionais);
  const servico = firstRelation(agendamento.servicos);
  const clienteNome = String(cliente?.nome || "cliente").trim();
  const profissionalNome =
    String(profissional?.nome_exibicao || profissional?.nome || "profissional").trim();
  const servicoNome = String(servico?.nome || "atendimento").trim();
  const quando = formatAppointmentDate(agendamento.data, agendamento.hora_inicio);
  const clienteAppContaId = await findClienteAppContaId({
    idSalao: params.idSalao,
    idCliente: agendamento.cliente_id,
  });

  await Promise.all([
    agendamento.profissional_id
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idProfissional: agendamento.profissional_id,
          canal: "profissional_app",
          tipo: "lembrete_30min_profissional",
          titulo: "Atendimento proximo",
          mensagem: `Ola, ${profissionalNome}. Seu atendimento com ${clienteNome} (${servicoNome}) comeca em ${minutosAntes} minutos, ${quando}.`,
          url: `/app-profissional/agenda/${agendamento.id}`,
          tag: `lembrete-profissional-${agendamento.id}`,
          enviarEm,
          idempotencyKey: `lembrete_30min:${agendamento.id}:profissional`,
        })
      : Promise.resolve(),
    clienteAppContaId
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idCliente: agendamento.cliente_id,
          clienteAppContaId,
          canal: "cliente_app",
          tipo: "lembrete_30min_cliente",
          titulo: "Seu horario esta chegando",
          mensagem: `Cuidado com atrasos: seu atendimento e daqui ${minutosAntes} minutos. Organize-se para nao atrasar o profissional ${profissionalNome}.`,
          url: "/app-cliente/agendamentos",
          tag: `lembrete-cliente-${agendamento.id}`,
          enviarEm,
          idempotencyKey: `lembrete_30min:${agendamento.id}:cliente`,
        })
      : Promise.resolve(),
  ]);
}

export async function notifyAppointmentRescheduled(params: {
  idAgendamento: string;
  idSalao: string;
  actor: "cliente" | "profissional" | "salao";
  previousDate?: string | null;
  previousTime?: string | null;
}) {
  const agendamento = await loadAppointmentContext(params.idAgendamento, params.idSalao);
  if (!agendamento) return;

  const cliente = firstRelation(agendamento.clientes);
  const profissional = firstRelation(agendamento.profissionais);
  const servico = firstRelation(agendamento.servicos);
  const clienteNome = String(cliente?.nome || "Cliente").trim();
  const profissionalNome =
    String(profissional?.nome_exibicao || profissional?.nome || "profissional").trim();
  const servicoNome = String(servico?.nome || "atendimento").trim();
  const quando = formatAppointmentDate(agendamento.data, agendamento.hora_inicio);
  const antes =
    params.previousDate || params.previousTime
      ? ` Antes estava em ${formatAppointmentDate(params.previousDate, params.previousTime)}.`
      : "";
  const clienteAppContaId = await findClienteAppContaId({
    idSalao: params.idSalao,
    idCliente: agendamento.cliente_id,
  });
  const currentKey = `${agendamento.data}:${String(agendamento.hora_inicio).slice(0, 5)}`;

  await Promise.all([
    clienteAppContaId
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idCliente: agendamento.cliente_id,
          clienteAppContaId,
          canal: "cliente_app",
          tipo: "reagendamento_cliente",
          titulo: "Horario reagendado",
          mensagem: `${servicoNome} com ${profissionalNome} ficou para ${quando}.${antes}`,
          url: "/app-cliente/agendamentos",
          tag: `reagendamento-cliente-${agendamento.id}`,
          idempotencyKey: `reagendamento:${agendamento.id}:cliente:${currentKey}`,
        })
      : Promise.resolve(),
    agendamento.profissional_id
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idProfissional: agendamento.profissional_id,
          canal: "profissional_app",
          tipo: "reagendamento_profissional",
          titulo: "Horario reagendado",
          mensagem: `${clienteNome} esta remarcado para ${quando}.${antes}`,
          url: `/app-profissional/agenda/${agendamento.id}`,
          tag: `reagendamento-profissional-${agendamento.id}`,
          idempotencyKey: `reagendamento:${agendamento.id}:profissional:${currentKey}`,
        })
      : Promise.resolve(),
    queueNotificationJob({
      idSalao: params.idSalao,
      canal: "salao_painel",
      tipo: params.actor === "cliente" ? "reagendamento_cliente_salao" : "reagendamento_salao",
      titulo: params.actor === "cliente" ? "Cliente reagendou pelo app" : "Horario reagendado",
      mensagem: `${clienteNome} agora esta marcado para ${quando}.${antes}`,
      url: `/agenda?agendamento=${agendamento.id}`,
      tag: `reagendamento-salao-${agendamento.id}`,
      idempotencyKey: `reagendamento:${agendamento.id}:salao:${currentKey}`,
    }),
  ]);

  await scheduleAppointmentReminderNotifications({
    idAgendamento: params.idAgendamento,
    idSalao: params.idSalao,
  });
  await processPendingNotificationJobs(20);
}

export async function notifyAppointmentCanceled(params: {
  idSalao: string;
  idAgendamento: string;
  idCliente?: string | null;
  idProfissional?: string | null;
  clienteAppContaId?: string | null;
  clienteNome?: string | null;
  profissionalNome?: string | null;
  servicoNome?: string | null;
  data?: string | null;
  horaInicio?: string | null;
  actor: "cliente" | "profissional" | "salao";
}) {
  const quando = formatAppointmentDate(params.data, params.horaInicio);
  const clienteNome = String(params.clienteNome || "Cliente").trim();
  const profissionalNome = String(params.profissionalNome || "profissional").trim();
  const servicoNome = String(params.servicoNome || "atendimento").trim();
  const clienteAppContaId =
    params.clienteAppContaId ||
    (await findClienteAppContaId({
      idSalao: params.idSalao,
      idCliente: params.idCliente,
    }));

  await Promise.all([
    params.actor !== "cliente" && clienteAppContaId
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idCliente: params.idCliente,
          clienteAppContaId,
          canal: "cliente_app",
          tipo: "cancelamento_cliente",
          titulo: "Horario cancelado",
          mensagem: `${servicoNome} com ${profissionalNome} em ${quando} foi cancelado.`,
          url: "/app-cliente/agendamentos",
          tag: `cancelamento-cliente-${params.idAgendamento}`,
          idempotencyKey: `cancelamento:${params.idAgendamento}:cliente`,
        })
      : Promise.resolve(),
    params.idProfissional
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idProfissional: params.idProfissional,
          canal: "profissional_app",
          tipo: "cancelamento_profissional",
          titulo: "Horario cancelado",
          mensagem: `${clienteNome} cancelou ${servicoNome} de ${quando}. O horario foi liberado.`,
          url: "/app-profissional/agenda",
          tag: `cancelamento-profissional-${params.idAgendamento}`,
          idempotencyKey: `cancelamento:${params.idAgendamento}:profissional`,
        })
      : Promise.resolve(),
    queueNotificationJob({
      idSalao: params.idSalao,
      canal: "salao_painel",
      tipo: params.actor === "cliente" ? "cancelamento_cliente_salao" : "cancelamento_salao",
      titulo: params.actor === "cliente" ? "Cliente cancelou pelo app" : "Horario cancelado",
      mensagem: `${clienteNome} cancelou ${servicoNome} de ${quando}. O horario ficou livre na agenda.`,
      url: "/agenda",
      tag: `cancelamento-salao-${params.idAgendamento}`,
      idempotencyKey: `cancelamento:${params.idAgendamento}:salao`,
    }),
  ]);

  await processPendingNotificationJobs(20);
}

export async function notifyAppointmentFinished(params: {
  idAgendamento: string;
  idSalao: string;
  total?: number | null;
}) {
  const agendamento = await loadAppointmentContext(params.idAgendamento, params.idSalao);
  if (!agendamento) return;

  const cliente = firstRelation(agendamento.clientes);
  const profissional = firstRelation(agendamento.profissionais);
  const servico = firstRelation(agendamento.servicos);
  const clienteNome = String(cliente?.nome || "Cliente").trim();
  const profissionalNome =
    String(profissional?.nome_exibicao || profissional?.nome || "profissional").trim();
  const servicoNome = String(servico?.nome || "atendimento").trim();
  const clienteAppContaId = await findClienteAppContaId({
    idSalao: params.idSalao,
    idCliente: agendamento.cliente_id,
  });
  const valor = Number(params.total || 0);
  const valorLabel = valor > 0
    ? ` Valor registrado: ${valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}.`
    : "";

  await Promise.all([
    agendamento.profissional_id
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idProfissional: agendamento.profissional_id,
          canal: "profissional_app",
          tipo: "atendimento_finalizado_profissional",
          titulo: "Atendimento finalizado",
          mensagem: `${servicoNome} com ${clienteNome} foi finalizado.${valorLabel}`,
          url: `/app-profissional/agenda/${agendamento.id}`,
          tag: `fim-profissional-${agendamento.id}`,
          idempotencyKey: `atendimento_finalizado:${agendamento.id}:profissional`,
        })
      : Promise.resolve(),
    clienteAppContaId
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idCliente: agendamento.cliente_id,
          clienteAppContaId,
          canal: "cliente_app",
          tipo: "atendimento_finalizado_cliente",
          titulo: "Atendimento finalizado",
          mensagem: `Atendimento finalizado. Obrigado pela preferencia, volte sempre.${valorLabel}`,
          url: `/app-cliente/agendamentos/${agendamento.id}/avaliar`,
          tag: `fim-cliente-${agendamento.id}`,
          idempotencyKey: `atendimento_finalizado:${agendamento.id}:cliente`,
        })
      : Promise.resolve(),
    clienteAppContaId
      ? queueNotificationJob({
          idSalao: params.idSalao,
          idCliente: agendamento.cliente_id,
          clienteAppContaId,
          canal: "cliente_app",
          tipo: "avaliar_atendimento",
          titulo: "Avalie seu atendimento",
          mensagem: `Como foi seu atendimento com ${profissionalNome}? Sua avaliacao ajuda o salao a cuidar melhor de voce.`,
          url: `/app-cliente/agendamentos/${agendamento.id}/avaliar`,
          tag: `avaliar-${agendamento.id}`,
          enviarEm: addMinutes(new Date(), 2),
          idempotencyKey: `avaliar_atendimento:${agendamento.id}:cliente`,
        })
      : Promise.resolve(),
  ]);

  await processPendingNotificationJobs(20);
}

export async function notifyComandaFinalizada(params: {
  idComanda: string;
  idSalao: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: comanda } = await (supabase as any)
    .from("comandas")
    .select("id, id_salao, total")
    .eq("id", params.idComanda)
    .eq("id_salao", params.idSalao)
    .maybeSingle();

  const { data: agendamentos } = await (supabase as any)
    .from("agendamentos")
    .select("id")
    .eq("id_salao", params.idSalao)
    .eq("id_comanda", params.idComanda)
    .limit(10);

  await Promise.all(
    ((agendamentos || []) as Array<{ id?: string | null }>).map((item) =>
      item.id
        ? notifyAppointmentFinished({
            idAgendamento: item.id,
            idSalao: params.idSalao,
            total: Number(comanda?.total || 0),
          })
        : Promise.resolve()
    )
  );
}

export async function notifyReviewReceived(params: {
  idSalao: string;
  idAgendamento: string;
  nota: number;
  comentario?: string | null;
}) {
  const tone = params.nota <= 3 ? "avaliacao_ruim" : "avaliacao_recebida";
  await queueNotificationJob({
    idSalao: params.idSalao,
    canal: "salao_painel",
    tipo: tone,
    titulo: params.nota <= 3 ? "Avaliacao precisa de atencao" : "Nova avaliacao recebida",
    mensagem:
      params.nota <= 3
        ? `Cliente avaliou com ${params.nota} estrela(s). Recomendado entrar em contato.`
        : `Nova avaliacao ${params.nota} estrela(s) recebida no app cliente.`,
    url: `/agenda?agendamento=${params.idAgendamento}`,
    tag: `avaliacao-${params.idAgendamento}`,
    idempotencyKey: `avaliacao:${params.idAgendamento}:salao:${params.nota}`,
    metadata: {
      nota: params.nota,
      comentario: params.comentario || null,
    },
  });

  await processPendingNotificationJobs(10);
}
