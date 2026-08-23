import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendManualMarketingWhatsApp } from "@/services/marketingWhatsAppService";

type AutomaticEvent =
  | "confirmacao_agendamento"
  | "agendamento_alterado"
  | "agendamento_cancelado"
  | "pagamento_confirmado";

type AutomaticPreferenceEvent = AutomaticEvent | "lembrete_agendamento";

type AutomaticJobRow = {
  id: string;
  id_salao: string;
  id_agendamento: string | null;
  id_comanda: string | null;
  evento: AutomaticEvent;
  idempotency_key: string;
  tentativas: number | null;
};

type AppointmentContext = {
  id: string;
  idSalao: string;
  data: string;
  hora: string;
  clienteId: string;
  clienteNome: string;
  clienteWhatsApp: string;
  profissionalNome: string;
  servicoNome: string;
  sinalValor: number;
};

function digits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function dateBR(value?: string | null) {
  const raw = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

function timeBR(value?: string | null) {
  return String(value || "").slice(0, 5);
}

function moneyBR(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function appointmentIdFromNotificationKey(value?: string | null) {
  const key = String(value || "");
  const match = /^(?:lembrete_30min|agendamento_confirmado_cliente|reagendamento|cancelamento):([0-9a-f-]{36})/i.exec(
    key
  );
  return match?.[1] || null;
}

async function isAutomationEnabled(
  idSalao: string,
  event: AutomaticPreferenceEvent
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from("whatsapp_automacoes_saloes")
    .select(event)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    if (String(error.message || "").includes("whatsapp_automacoes_saloes")) {
      return true;
    }
    throw new Error(error.message);
  }

  return data?.[event] !== false;
}

async function loadAppointmentContext(idSalao: string, idAgendamento: string) {
  const supabase = getSupabaseAdmin();
  const appointmentResult = await (supabase as any)
    .from("agendamentos")
    .select(
      "id, id_salao, cliente_id, profissional_id, servico_id, data, hora_inicio, sinal_valor"
    )
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (appointmentResult.error) throw new Error(appointmentResult.error.message);
  const appointment = appointmentResult.data as Record<string, unknown> | null;
  if (!appointment?.id) throw new Error("Agendamento nao encontrado para o envio WhatsApp.");

  const [clienteResult, profissionalResult, servicoResult] = await Promise.all([
    (supabase as any)
      .from("clientes")
      .select("id, nome, nome_social, whatsapp, telefone")
      .eq("id", appointment.cliente_id)
      .eq("id_salao", idSalao)
      .maybeSingle(),
    (supabase as any)
      .from("profissionais")
      .select("id, nome, nome_social, nome_exibicao")
      .eq("id", appointment.profissional_id)
      .eq("id_salao", idSalao)
      .maybeSingle(),
    (supabase as any)
      .from("servicos")
      .select("id, nome")
      .eq("id", appointment.servico_id)
      .eq("id_salao", idSalao)
      .maybeSingle(),
  ]);

  if (clienteResult.error) throw new Error(clienteResult.error.message);
  if (profissionalResult.error) throw new Error(profissionalResult.error.message);
  if (servicoResult.error) throw new Error(servicoResult.error.message);

  const cliente = (clienteResult.data || {}) as Record<string, unknown>;
  const profissional = (profissionalResult.data || {}) as Record<string, unknown>;
  const servico = (servicoResult.data || {}) as Record<string, unknown>;
  const whatsapp = digits(String(cliente.whatsapp || cliente.telefone || ""));

  return {
    id: String(appointment.id),
    idSalao,
    data: String(appointment.data || ""),
    hora: String(appointment.hora_inicio || ""),
    clienteId: String(appointment.cliente_id || ""),
    clienteNome: String(cliente.nome_social || cliente.nome || "Cliente").trim(),
    clienteWhatsApp: whatsapp,
    profissionalNome: String(
      profissional.nome_exibicao || profissional.nome_social || profissional.nome || "Profissional"
    ).trim(),
    servicoNome: String(servico.nome || "Servico").trim(),
    sinalValor: Number(appointment.sinal_valor || 0),
  } satisfies AppointmentContext;
}

async function loadComandaContext(idSalao: string, idComanda: string) {
  const supabase = getSupabaseAdmin();
  const { data: comanda, error } = await (supabase as any)
    .from("comandas")
    .select("id, numero, id_cliente, id_agendamento_principal, total, fechada_em")
    .eq("id", idComanda)
    .eq("id_salao", idSalao)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!comanda?.id || !comanda.id_cliente) throw new Error("Comanda sem cliente para aviso WhatsApp.");

  const { data: cliente, error: clienteError } = await (supabase as any)
    .from("clientes")
    .select("nome, nome_social, whatsapp, telefone")
    .eq("id", comanda.id_cliente)
    .eq("id_salao", idSalao)
    .maybeSingle();
  if (clienteError) throw new Error(clienteError.message);

  return {
    clienteNome: String(cliente?.nome_social || cliente?.nome || "Cliente").trim(),
    clienteWhatsApp: digits(String(cliente?.whatsapp || cliente?.telefone || "")),
    total: Number(comanda.total || 0),
    numero: String(comanda.numero || comanda.id).trim(),
    data: dateBR(String(comanda.fechada_em || new Date().toISOString())),
    idAgendamento: comanda.id_agendamento_principal
      ? String(comanda.id_agendamento_principal)
      : null,
  };
}

async function sendAppointmentEvent(params: {
  event: AutomaticPreferenceEvent;
  idSalao: string;
  idAgendamento: string;
  idempotencyKey: string;
}) {
  if (!(await isAutomationEnabled(params.idSalao, params.event))) {
    return { skipped: true, reason: "automation_disabled" as const };
  }

  const ctx = await loadAppointmentContext(params.idSalao, params.idAgendamento);
  if (!ctx.clienteWhatsApp) throw new Error("Cliente sem WhatsApp cadastrado.");

  if (params.event === "confirmacao_agendamento") {
    return sendManualMarketingWhatsApp({
      idSalao: params.idSalao,
      destino: ctx.clienteWhatsApp,
      tipo: "confirmacao_agendamento",
      tipoInterno: "agendamento_confirmacao",
      template: "confirmacao_agendamento",
      templateVariables: [
        ctx.clienteNome,
        dateBR(ctx.data),
        timeBR(ctx.hora),
        ctx.profissionalNome,
        ctx.servicoNome,
      ],
      idAgendamento: ctx.id,
      idempotencyKey: params.idempotencyKey,
    });
  }

  if (params.event === "lembrete_agendamento") {
    return sendManualMarketingWhatsApp({
      idSalao: params.idSalao,
      destino: ctx.clienteWhatsApp,
      tipo: "lembrete_agendamento",
      tipoInterno: "lembrete_agendamento",
      template: "lembrete_agendamento",
      templateVariables: [
        ctx.clienteNome,
        dateBR(ctx.data),
        timeBR(ctx.hora),
        ctx.profissionalNome,
        ctx.servicoNome,
      ],
      idAgendamento: ctx.id,
      idempotencyKey: params.idempotencyKey,
    });
  }

  if (params.event === "agendamento_alterado") {
    return sendManualMarketingWhatsApp({
      idSalao: params.idSalao,
      destino: ctx.clienteWhatsApp,
      tipo: "agendamento_alterado",
      tipoInterno: "agendamento_alteracao",
      template: "agendamento_alterado",
      templateVariables: [
        ctx.clienteNome,
        dateBR(ctx.data),
        timeBR(ctx.hora),
        ctx.profissionalNome,
        ctx.servicoNome,
      ],
      idAgendamento: ctx.id,
      idempotencyKey: params.idempotencyKey,
    });
  }

  if (params.event === "agendamento_cancelado") {
    return sendManualMarketingWhatsApp({
      idSalao: params.idSalao,
      destino: ctx.clienteWhatsApp,
      tipo: "agendamento_cancelado",
      tipoInterno: "agendamento_cancelamento",
      template: "agendamento_cancelado",
      templateVariables: [
        ctx.clienteNome,
        dateBR(ctx.data),
        timeBR(ctx.hora),
        ctx.servicoNome,
        ctx.profissionalNome,
      ],
      idAgendamento: ctx.id,
      idempotencyKey: params.idempotencyKey,
    });
  }

  return sendManualMarketingWhatsApp({
    idSalao: params.idSalao,
    destino: ctx.clienteWhatsApp,
    tipo: "pagamento_confirmado",
    tipoInterno: "pagamento_confirmacao",
    template: "pagamento_confirmado",
    templateVariables: [
      ctx.clienteNome,
      moneyBR(ctx.sinalValor),
      `Agendamento ${ctx.id.slice(0, 8).toUpperCase()}`,
      dateBR(new Date().toISOString()),
    ],
    idAgendamento: ctx.id,
    idempotencyKey: params.idempotencyKey,
  });
}

async function sendComandaPaymentEvent(job: AutomaticJobRow) {
  if (!(await isAutomationEnabled(job.id_salao, "pagamento_confirmado"))) {
    return { skipped: true, reason: "automation_disabled" as const };
  }

  if (!job.id_comanda) throw new Error("Comanda ausente no job WhatsApp.");
  const ctx = await loadComandaContext(job.id_salao, job.id_comanda);
  if (!ctx.clienteWhatsApp) throw new Error("Cliente sem WhatsApp cadastrado.");

  return sendManualMarketingWhatsApp({
    idSalao: job.id_salao,
    destino: ctx.clienteWhatsApp,
    tipo: "pagamento_confirmado",
    tipoInterno: "pagamento_confirmacao",
    template: "pagamento_confirmado",
    templateVariables: [ctx.clienteNome, moneyBR(ctx.total), `Comanda ${ctx.numero}`, ctx.data],
    idAgendamento: ctx.idAgendamento,
    idempotencyKey: job.idempotency_key,
  });
}

function permanentFailure(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("saldo whatsapp insuficiente") ||
    text.includes("cliente sem whatsapp") ||
    text.includes("template whatsapp nao encontrado") ||
    text.includes("tarifa whatsapp inativa") ||
    text.includes("sem acesso") ||
    text.includes("plano")
  );
}

export async function processPendingAutomaticWhatsAppEvents(limit = 25) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from("whatsapp_automatic_jobs")
    .select(
      "id, id_salao, id_agendamento, id_comanda, evento, idempotency_key, tentativas"
    )
    .eq("status", "pendente")
    .lte("enviar_em", now)
    .order("enviar_em", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 50)));

  if (error) {
    if (String(error.message || "").includes("whatsapp_automatic_jobs")) {
      return { processed: 0, sent: 0, failed: 0 };
    }
    throw new Error(error.message);
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const job of (data || []) as AutomaticJobRow[]) {
    const lock = await (supabase as any)
      .from("whatsapp_automatic_jobs")
      .update({
        status: "processando",
        tentativas: Number(job.tentativas || 0) + 1,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (lock.error || !lock.data?.id) continue;

    try {
      if (job.evento === "pagamento_confirmado" && job.id_comanda) {
        await sendComandaPaymentEvent(job);
      } else {
        if (!job.id_agendamento) throw new Error("Agendamento ausente no job WhatsApp.");
        await sendAppointmentEvent({
          event: job.evento,
          idSalao: job.id_salao,
          idAgendamento: job.id_agendamento,
          idempotencyKey: job.idempotency_key,
        });
      }

      await (supabase as any)
        .from("whatsapp_automatic_jobs")
        .update({
          status: "enviado",
          processado_em: new Date().toISOString(),
          erro_texto: null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", job.id);
      processed += 1;
      sent += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro no envio automatico WhatsApp.";
      const attempts = Number(job.tentativas || 0) + 1;
      const retry = attempts < 3 && !permanentFailure(message);
      await (supabase as any)
        .from("whatsapp_automatic_jobs")
        .update({
          status: retry ? "pendente" : "falhou",
          enviar_em: retry
            ? new Date(Date.now() + attempts * 5 * 60_000).toISOString()
            : now,
          erro_texto: message.slice(0, 1000),
          processado_em: retry ? null : new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", job.id);
      processed += 1;
      failed += 1;
    }
  }

  return { processed, sent, failed };
}

export async function processDueWhatsAppReminders(limit = 20) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data, error } = await (supabase as any)
    .from("notification_jobs")
    .select("id_salao, idempotency_key, enviar_em")
    .eq("tipo", "lembrete_30min_cliente")
    .lte("enviar_em", now)
    .gte("enviar_em", since)
    .order("enviar_em", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 40)));

  if (error) return { processed: 0, sent: 0, failed: 0 };

  let processed = 0;
  let sent = 0;
  let failed = 0;
  for (const row of data || []) {
    const idSalao = String(row.id_salao || "");
    const idAgendamento = appointmentIdFromNotificationKey(row.idempotency_key);
    if (!idSalao || !idAgendamento) continue;

    processed += 1;
    try {
      await sendAppointmentEvent({
        event: "lembrete_agendamento",
        idSalao,
        idAgendamento,
        idempotencyKey: `auto:lembrete:${row.idempotency_key}`,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed, sent, failed };
}
