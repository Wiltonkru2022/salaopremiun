import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadSalonNotificationSettings } from "@/lib/salon-notification-settings";

export type PushAudience = "cliente_app" | "profissional_app" | "salao_painel";

type PushSubscriptionInput = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  cliente_app_conta_id?: string | null;
};

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
};

export type BroadcastPushTarget =
  | "todos"
  | "clientes"
  | "profissionais"
  | "saloes";

type PushBurstState = {
  lastSentAt: number;
  tagSentAt: Map<string, number>;
};

const PUSH_BURST_WINDOW_MS = 25 * 1000;
const PUSH_SAME_TAG_WINDOW_MS = 10 * 60 * 1000;
const recentPushByEndpoint = new Map<string, PushBurstState>();

function getPushConfig() {
  const publicKey = String(process.env.WEB_PUSH_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.WEB_PUSH_PRIVATE_KEY || "").trim();
  const subject =
    String(process.env.WEB_PUSH_SUBJECT || "").trim() ||
    "mailto:suporte@salaopremiun.com.br";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function getWebPushPublicKey() {
  return getPushConfig()?.publicKey || null;
}

function parseSubscription(subscription: PushSubscriptionInput) {
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Inscricao de notificacao invalida.");
  }

  return { endpoint, p256dh, auth };
}

export async function upsertPushSubscription(params: {
  audience: PushAudience;
  subscription: PushSubscriptionInput;
  idSalao?: string | null;
  idUsuario?: string | null;
  idProfissional?: string | null;
  clienteAppContaId?: string | null;
  userAgent?: string | null;
}) {
  const parsed = parseSubscription(params.subscription);
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await (supabase as any)
    .from("push_subscriptions")
    .upsert(
      {
        audience: params.audience,
        endpoint: parsed.endpoint,
        p256dh: parsed.p256dh,
        auth: parsed.auth,
        id_salao: params.idSalao || null,
        id_usuario: params.idUsuario || null,
        id_profissional: params.idProfissional || null,
        cliente_app_conta_id: params.clienteAppContaId || null,
        user_agent: params.userAgent || null,
        ativo: true,
        ultimo_uso_em: now,
        updated_at: now,
      },
      { onConflict: "audience,endpoint" }
    );

  if (error) {
    throw new Error(error.message);
  }
}

async function markSubscriptionInactive(id: string) {
  try {
    await (getSupabaseAdmin() as any)
      .from("push_subscriptions")
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch {
    // Push cleanup is best effort.
  }
}

async function isClienteAppPushEnabled(clienteAppContaId?: string | null) {
  const id = String(clienteAppContaId || "").trim();
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

async function filterClienteAppSubscriptionsByPreference(
  rows: PushSubscriptionRow[]
) {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => String(row.cliente_app_conta_id || "").trim())
        .filter(Boolean)
    )
  );

  if (!ids.length) return [];

  const { data, error } = await (getSupabaseAdmin() as any)
    .from("clientes_app_auth")
    .select("id, notificacoes_ativas, notificacao_app_ativa")
    .in("id", ids);

  if (error) {
    const message = String(error.message || "");
    if (
      message.includes("notificacoes_ativas") ||
      message.includes("notificacao_app_ativa")
    ) {
      return rows;
    }
    return [];
  }

  const enabledIds = new Set(
    ((data || []) as Array<{
      id: string;
      notificacoes_ativas?: boolean | null;
      notificacao_app_ativa?: boolean | null;
    }>)
      .filter(
        (cliente) =>
          cliente.notificacoes_ativas !== false &&
          cliente.notificacao_app_ativa !== false
      )
      .map((cliente) => cliente.id)
  );

  return rows.filter((row) =>
    enabledIds.has(String(row.cliente_app_conta_id || "").trim())
  );
}

function pruneRecentPushes(now: number) {
  for (const [endpoint, state] of recentPushByEndpoint.entries()) {
    if (now - state.lastSentAt > PUSH_SAME_TAG_WINDOW_MS) {
      recentPushByEndpoint.delete(endpoint);
      continue;
    }

    for (const [tag, sentAt] of state.tagSentAt.entries()) {
      if (now - sentAt > PUSH_SAME_TAG_WINDOW_MS) {
        state.tagSentAt.delete(tag);
      }
    }
  }
}

function shouldThrottlePush(endpoint: string, payload: PushPayload) {
  const now = Date.now();
  pruneRecentPushes(now);

  const tag = payload.tag || "salaopremium-update";
  const state = recentPushByEndpoint.get(endpoint);
  if (!state) return false;

  const sameTagAt = state.tagSentAt.get(tag);
  if (sameTagAt && now - sameTagAt < PUSH_SAME_TAG_WINDOW_MS) {
    return true;
  }

  if (
    !payload.renotify &&
    !payload.requireInteraction &&
    now - state.lastSentAt < PUSH_BURST_WINDOW_MS
  ) {
    return true;
  }

  return false;
}

function rememberPushSent(endpoint: string, payload: PushPayload) {
  const now = Date.now();
  const tag = payload.tag || "salaopremium-update";
  const state =
    recentPushByEndpoint.get(endpoint) ||
    ({
      lastSentAt: 0,
      tagSentAt: new Map<string, number>(),
    } satisfies PushBurstState);

  state.lastSentAt = now;
  state.tagSentAt.set(tag, now);
  recentPushByEndpoint.set(endpoint, state);
}

export async function sendPushToRows(
  rows: PushSubscriptionRow[],
  payload: PushPayload
) {
  const config = getPushConfig();
  if (!config || !rows.length) return { sent: 0 };
  const uniqueRows = Array.from(
    new Map(rows.map((row) => [row.endpoint, row])).values()
  );

  const webPush = await import("web-push");
  webPush.default.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey
  );

  let sent = 0;
  const pushPayload: PushPayload = {
    ...payload,
    renotify: payload.renotify ?? false,
    requireInteraction: payload.requireInteraction ?? false,
    silent: payload.silent ?? false,
    timestamp: payload.timestamp || Date.now(),
  };

  await Promise.all(
    uniqueRows.map(async (row) => {
      if (shouldThrottlePush(row.endpoint, pushPayload)) return;

      try {
        await webPush.default.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          JSON.stringify(pushPayload),
          { TTL: 60 * 60 * 12 }
        );
        rememberPushSent(row.endpoint, pushPayload);
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await markSubscriptionInactive(row.id);
        }
      }
    })
  );

  return { sent };
}

export async function broadcastPushNotification(params: {
  target: BroadcastPushTarget;
  title: string;
  body: string;
  url?: string | null;
  idSalao?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const title = String(params.title || "").trim();
  const body = String(params.body || "").trim();

  if (!title || !body) {
    throw new Error("Informe titulo e mensagem.");
  }

  let query = (supabase as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, cliente_app_conta_id")
    .eq("ativo", true);

  if (params.target === "clientes") {
    query = query.eq("audience", "cliente_app");
  } else if (params.target === "profissionais") {
    query = query.eq("audience", "profissional_app");
  } else if (params.target === "saloes") {
    query = query.eq("audience", "salao_painel");
  }

  if (params.idSalao) {
    query = query.eq("id_salao", params.idSalao);
  }

  const { data: rows, error } = await query.limit(2000);
  if (error) {
    throw new Error(error.message);
  }

  let subscriptions = (rows || []) as PushSubscriptionRow[];
  if (params.target === "clientes") {
    subscriptions = await filterClienteAppSubscriptionsByPreference(subscriptions);
  }

  const result = await sendPushToRows(subscriptions, {
    title,
    body,
    url: params.url || "/",
    tag: `admin-master-${params.target}-${params.idSalao || "geral"}`,
  });

  return {
    sent: result.sent,
  };
}

function formatAppointmentDate(date?: string | null, time?: string | null) {
  const dateText = date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(`${date}T12:00:00`))
    : "data escolhida";
  const timeText = String(time || "").slice(0, 5);
  return timeText ? `${dateText} as ${timeText}` : dateText;
}

export async function notifySalonAboutClientBooking(params: {
  idAgendamento: string;
  idSalao: string;
  idProfissional: string;
  clienteNome: string;
  servicoNome: string;
  data: string;
  horaInicio: string;
}) {
  try {
    const settings = await loadSalonNotificationSettings(params.idSalao);
    const supabase = getSupabaseAdmin();
    const [salaoResult, profissionalResult] = await Promise.all([
      (supabase as any)
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("audience", "salao_painel")
        .eq("ativo", true)
        .eq("id_salao", params.idSalao),
      (supabase as any)
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("audience", "profissional_app")
        .eq("ativo", true)
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional),
    ]);

    const body = `${params.clienteNome} quer confirmar ${params.servicoNome} em ${formatAppointmentDate(
      params.data,
      params.horaInicio
    )}. Toque para revisar.`;

    if (settings.salaoNovoAgendamentoApp && !salaoResult.error && salaoResult.data?.length) {
      await sendPushToRows(salaoResult.data as PushSubscriptionRow[], {
        title: "Pedido de horario recebido",
        body,
        url: `/agenda?agendamento=${params.idAgendamento}`,
        tag: `agendamento-${params.idAgendamento}`,
      });
    }

    if (!profissionalResult.error && profissionalResult.data?.length) {
      await sendPushToRows(profissionalResult.data as PushSubscriptionRow[], {
        title: "Pedido de horario para confirmar",
        body,
        url: `/app-profissional/agenda/${params.idAgendamento}`,
        tag: `agendamento-${params.idAgendamento}`,
      });
    }
  } catch {
    // Notificacao push nunca deve bloquear o agendamento.
  }
}

export async function notifyClientAppointmentConfirmed(params: {
  idAgendamento: string;
  idSalao: string;
}) {
  try {
    const settings = await loadSalonNotificationSettings(params.idSalao);
    if (!settings.clienteAgendamentoConfirmado) return;

    const supabase = getSupabaseAdmin();
    const { data: agendamento, error: appointmentError } = await (supabase as any)
      .from("agendamentos")
      .select("id, id_salao, cliente_id, servico_id, data, hora_inicio")
      .eq("id", params.idAgendamento)
      .eq("id_salao", params.idSalao)
      .maybeSingle();

    if (appointmentError || !agendamento?.cliente_id) return;

    const { data: clienteAuth, error: authError } = await (supabase as any)
      .from("clientes_auth")
      .select("app_conta_id")
      .eq("id_salao", params.idSalao)
      .eq("id_cliente", agendamento.cliente_id)
      .eq("app_ativo", true)
      .not("app_conta_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (authError || !clienteAuth?.app_conta_id) return;
    const clientePushEnabled = await isClienteAppPushEnabled(
      clienteAuth.app_conta_id
    );
    if (!clientePushEnabled) return;

    const { data: rows, error: rowsError } = await (supabase as any)
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("audience", "cliente_app")
      .eq("ativo", true)
      .eq("cliente_app_conta_id", clienteAuth.app_conta_id);

    if (rowsError || !rows?.length) return;

    const { data: servico } = agendamento.servico_id
      ? await (supabase as any)
          .from("servicos")
          .select("nome")
          .eq("id", agendamento.servico_id)
          .eq("id_salao", params.idSalao)
          .maybeSingle()
      : { data: null };

    await sendPushToRows(rows as PushSubscriptionRow[], {
      title: "Horario confirmado",
      body: `${servico?.nome || "Seu horario"} foi confirmado para ${formatAppointmentDate(
        agendamento.data,
        agendamento.hora_inicio
      )}. Nos vemos em breve.`,
      url: "/app-cliente/agendamentos",
      tag: `agendamento-confirmado-${params.idAgendamento}`,
    });
  } catch {
    // Confirmacao da agenda nao pode depender do push.
  }
}
