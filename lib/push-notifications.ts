import "server-only";

import { getDatabaseAdmin } from "@/lib/db/admin";
import { loadSalonNotificationSettings } from "@/lib/salon-notification-settings";
import {
  classifyPushFailure,
  getPushEndpointHost,
  getPushRetryDelayMs,
  type PushFailureCategory,
} from "@/lib/push-delivery-utils";
import { sendNativePushToAudience } from "@/lib/native-push-notifications";

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
  audience?: PushAudience | null;
  cliente_app_conta_id?: string | null;
  id_profissional?: string | null;
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

export type PushDeliveryFailure = {
  subscriptionId: string;
  statusCode: number;
  category: PushFailureCategory;
  message: string;
};

export type PushSendResult = {
  attempted: number;
  sent: number;
  failed: number;
  ignored: number;
  errors: PushDeliveryFailure[];
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

type PushProviderError = {
  statusCode?: unknown;
  message?: unknown;
  body?: unknown;
};

type WebPushModule = typeof import("web-push");

const PUSH_BURST_WINDOW_MS = 25 * 1000;
const PUSH_SAME_TAG_WINDOW_MS = 10 * 60 * 1000;
const PUSH_SUBSCRIPTION_REFRESH_MS = 12 * 60 * 60 * 1000;
const PUSH_MAX_ATTEMPTS = 3;
const PUSH_ERROR_MESSAGE_MAX_LENGTH = 1000;
const recentPushByEndpoint = new Map<string, PushBurstState>();

function getPushConfig() {
  const publicKey = String(process.env.WEB_PUSH_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.WEB_PUSH_PRIVATE_KEY || "").trim();
  const subject =
    String(process.env.WEB_PUSH_SUBJECT || "").trim() ||
    "mailto:suporte@salaopremiun.com.br";

  if (!publicKey || !privateKey) return null;
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
  const supabase = getDatabaseAdmin();
  const now = new Date().toISOString();
  const { data: existing } = await (supabase as any)
    .from("push_subscriptions")
    .select(
      "id, p256dh, auth, id_salao, id_usuario, id_profissional, cliente_app_conta_id, ativo, updated_at"
    )
    .eq("audience", params.audience)
    .eq("endpoint", parsed.endpoint)
    .maybeSingle();

  if (existing?.id) {
    const sameOwner =
      String(existing.id_salao || "") === String(params.idSalao || "") &&
      String(existing.id_usuario || "") === String(params.idUsuario || "") &&
      String(existing.id_profissional || "") === String(params.idProfissional || "") &&
      String(existing.cliente_app_conta_id || "") === String(params.clienteAppContaId || "");
    const sameKeys =
      String(existing.p256dh || "") === parsed.p256dh &&
      String(existing.auth || "") === parsed.auth;
    const updatedAt = new Date(String(existing.updated_at || 0)).getTime();
    const recentlyTouched =
      Number.isFinite(updatedAt) &&
      Date.now() - updatedAt < PUSH_SUBSCRIPTION_REFRESH_MS;

    if (existing.ativo !== false && sameOwner && sameKeys && recentlyTouched) {
      return;
    }
  }

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

  if (error) throw new Error(error.message);

  if (params.audience === "cliente_app" && params.clienteAppContaId) {
    await (supabase as any)
      .from("push_subscriptions")
      .update({ ativo: false, updated_at: now })
      .eq("audience", "cliente_app")
      .eq("cliente_app_conta_id", params.clienteAppContaId)
      .neq("endpoint", parsed.endpoint)
      .eq("ativo", true);
  }
}

async function isClienteAppPushEnabled(clienteAppContaId?: string | null) {
  const id = String(clienteAppContaId || "").trim();
  if (!id) return false;

  const { data, error } = await (getDatabaseAdmin() as any)
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

  const { data, error } = await (getDatabaseAdmin() as any)
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

async function filterProfissionalAppSubscriptionsByPreference(
  rows: PushSubscriptionRow[]
) {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => String(row.id_profissional || "").trim())
        .filter(Boolean)
    )
  );
  if (!ids.length) return [];

  const { data, error } = await (getDatabaseAdmin() as any)
    .from("profissionais")
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
        (profissional) =>
          profissional.notificacoes_ativas !== false &&
          profissional.notificacao_app_ativa !== false
      )
      .map((profissional) => profissional.id)
  );

  return rows.filter((row) =>
    enabledIds.has(String(row.id_profissional || "").trim())
  );
}

async function isProfissionalNativePushEnabled(idProfissional?: string | null) {
  const id = String(idProfissional || "").trim();
  if (!id) return false;

  const { data, error } = await (getDatabaseAdmin() as any)
    .from("profissionais")
    .select("id, notificacoes_ativas, notificacao_app_ativa")
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

  return data?.notificacoes_ativas !== false && data?.notificacao_app_ativa !== false;
}

async function sendPushToRowsSafely(rows: PushSubscriptionRow[], payload: PushPayload) {
  if (!rows.length) return;

  try {
    await sendPushToRows(rows, payload);
  } catch (error) {
    console.error("[push] falha ao enviar Web Push", {
      message: normalizeErrorMessage(error),
    });
  }
}

function pruneRecentPushes(now: number) {
  for (const [endpoint, state] of recentPushByEndpoint.entries()) {
    if (now - state.lastSentAt > PUSH_SAME_TAG_WINDOW_MS) {
      recentPushByEndpoint.delete(endpoint);
      continue;
    }

    for (const [tag, sentAt] of state.tagSentAt.entries()) {
      if (now - sentAt > PUSH_SAME_TAG_WINDOW_MS) state.tagSentAt.delete(tag);
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
  if (sameTagAt && now - sameTagAt < PUSH_SAME_TAG_WINDOW_MS) return true;

  return Boolean(
    !payload.renotify &&
      !payload.requireInteraction &&
      now - state.lastSentAt < PUSH_BURST_WINDOW_MS
  );
}

function rememberPushSent(endpoint: string, payload: PushPayload) {
  const now = Date.now();
  const tag = payload.tag || "salaopremium-update";
  const state =
    recentPushByEndpoint.get(endpoint) ||
    ({ lastSentAt: 0, tagSentAt: new Map<string, number>() } satisfies PushBurstState);

  state.lastSentAt = now;
  state.tagSentAt.set(tag, now);
  recentPushByEndpoint.set(endpoint, state);
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, PUSH_ERROR_MESSAGE_MAX_LENGTH);
  }
  if (typeof error === "object" && error !== null) {
    const providerError = error as PushProviderError;
    const message = String(providerError.message || providerError.body || "").trim();
    if (message) return message.slice(0, PUSH_ERROR_MESSAGE_MAX_LENGTH);
  }
  return "Falha desconhecida ao enviar Web Push.";
}

function getErrorStatusCode(error: unknown) {
  if (typeof error !== "object" || error === null) return 0;
  const statusCode = Number((error as PushProviderError).statusCode || 0);
  return Number.isFinite(statusCode) ? statusCode : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadSubscriptionMetadata(row: PushSubscriptionRow) {
  try {
    const { data } = await (getDatabaseAdmin() as any)
      .from("push_subscriptions")
      .select("audience, failure_count")
      .eq("id", row.id)
      .maybeSingle();

    const rawAudience = String(row.audience || data?.audience || "");
    const audience: PushAudience | null =
      rawAudience === "cliente_app" ||
      rawAudience === "profissional_app" ||
      rawAudience === "salao_painel"
        ? rawAudience
        : null;

    return {
      audience,
      failureCount: Number(data?.failure_count || 0),
    };
  } catch {
    return { audience: row.audience || null, failureCount: 0 };
  }
}

async function recordPushDelivery(params: {
  row: PushSubscriptionRow;
  payload: PushPayload;
  status: "enviada" | "falhou" | "ignorada";
  httpStatus?: number | null;
  errorMessage?: string | null;
  deactivateSubscription?: boolean;
}) {
  try {
    const supabase = getDatabaseAdmin() as any;
    const now = new Date().toISOString();
    const metadata = await loadSubscriptionMetadata(params.row);

    if (params.status === "enviada") {
      await supabase
        .from("push_subscriptions")
        .update({
          ativo: true,
          ultimo_uso_em: now,
          last_success_at: now,
          last_error_code: null,
          last_error_message: null,
          failure_count: 0,
          updated_at: now,
        })
        .eq("id", params.row.id);
    } else if (params.status === "falhou") {
      const failureUpdate: Record<string, unknown> = {
        last_failure_at: now,
        last_error_code: params.httpStatus || null,
        last_error_message: params.errorMessage || "Falha ao enviar Web Push.",
        failure_count: Math.max(0, metadata.failureCount) + 1,
        updated_at: now,
      };
      if (params.deactivateSubscription) failureUpdate.ativo = false;

      await supabase
        .from("push_subscriptions")
        .update(failureUpdate)
        .eq("id", params.row.id);
    }

    if (!metadata.audience) return;

    await supabase.from("push_delivery_log").insert({
      push_subscription_id: params.row.id,
      audience: metadata.audience,
      endpoint_host: getPushEndpointHost(params.row.endpoint),
      notification_tag: params.payload.tag || null,
      title: params.payload.title || null,
      status: params.status,
      http_status: params.httpStatus || null,
      error_message: params.errorMessage || null,
      created_at: now,
    });
  } catch (diagnosticError) {
    console.error("[push] falha ao registrar diagnostico", {
      subscriptionId: params.row.id,
      message: normalizeErrorMessage(diagnosticError),
    });
  }
}

async function sendNotificationWithRetry(params: {
  webPush: WebPushModule;
  row: PushSubscriptionRow;
  payload: PushPayload;
}) {
  for (let attempt = 1; attempt <= PUSH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await params.webPush.sendNotification(
        {
          endpoint: params.row.endpoint,
          keys: { p256dh: params.row.p256dh, auth: params.row.auth },
        },
        JSON.stringify(params.payload),
        { TTL: 60 * 60 * 12 }
      );

      return { ok: true as const, statusCode: Number(response?.statusCode || 201) };
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      const policy = classifyPushFailure(statusCode);

      if (!policy.retryable || attempt >= PUSH_MAX_ATTEMPTS) {
        return {
          ok: false as const,
          statusCode,
          message: normalizeErrorMessage(error),
          policy,
        };
      }

      await sleep(getPushRetryDelayMs(attempt));
    }
  }

  return {
    ok: false as const,
    statusCode: 0,
    message: "Web Push excedeu o limite de tentativas.",
    policy: classifyPushFailure(0),
  };
}

function buildDeliveryFailure(
  row: PushSubscriptionRow,
  statusCode: number,
  category: PushFailureCategory,
  message: string
): PushDeliveryFailure {
  return { subscriptionId: row.id, statusCode, category, message };
}

export async function sendPushToRows(
  rows: PushSubscriptionRow[],
  payload: PushPayload
): Promise<PushSendResult> {
  if (!rows.length) {
    return { attempted: 0, sent: 0, failed: 0, ignored: 0, errors: [] };
  }

  const uniqueRows = Array.from(
    new Map(rows.map((row) => [row.endpoint, row])).values()
  );
  const pushPayload: PushPayload = {
    ...payload,
    renotify: payload.renotify ?? false,
    requireInteraction: payload.requireInteraction ?? false,
    silent: payload.silent ?? false,
    timestamp: payload.timestamp || Date.now(),
  };
  const config = getPushConfig();

  if (!config) {
    const message =
      "Web Push nao configurado: WEB_PUSH_PUBLIC_KEY e WEB_PUSH_PRIVATE_KEY sao obrigatorias.";
    await Promise.all(
      uniqueRows.map((row) =>
        recordPushDelivery({
          row,
          payload: pushPayload,
          status: "falhou",
          httpStatus: 0,
          errorMessage: message,
          deactivateSubscription: false,
        })
      )
    );
    throw new Error(message);
  }

  const importedWebPush = await import("web-push");
  const defaultWebPush = (
    importedWebPush as unknown as { default?: WebPushModule }
  ).default;
  const webPush: WebPushModule = defaultWebPush || importedWebPush;
  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  let sent = 0;
  let failed = 0;
  let ignored = 0;
  const errors: PushDeliveryFailure[] = [];

  await Promise.all(
    uniqueRows.map(async (row) => {
      if (shouldThrottlePush(row.endpoint, pushPayload)) {
        ignored += 1;
        await recordPushDelivery({
          row,
          payload: pushPayload,
          status: "ignorada",
          errorMessage: "Envio ignorado pelo controle anti-duplicacao.",
        });
        return;
      }

      const delivery = await sendNotificationWithRetry({
        webPush,
        row,
        payload: pushPayload,
      });

      if (delivery.ok) {
        rememberPushSent(row.endpoint, pushPayload);
        sent += 1;
        await recordPushDelivery({
          row,
          payload: pushPayload,
          status: "enviada",
          httpStatus: delivery.statusCode,
        });
        return;
      }

      failed += 1;
      errors.push(
        buildDeliveryFailure(
          row,
          delivery.statusCode,
          delivery.policy.category,
          delivery.message
        )
      );
      await recordPushDelivery({
        row,
        payload: pushPayload,
        status: "falhou",
        httpStatus: delivery.statusCode,
        errorMessage: delivery.message,
        deactivateSubscription: delivery.policy.deactivateSubscription,
      });
    })
  );

  const result: PushSendResult = {
    attempted: uniqueRows.length,
    sent,
    failed,
    ignored,
    errors,
  };

  if (sent === 0 && failed > 0) {
    const first = errors[0];
    throw new Error(
      first
        ? `Web Push falhou (${first.statusCode || "sem HTTP"}, ${first.category}): ${first.message}`
        : "Web Push falhou em todos os endpoints."
    );
  }

  return result;
}

export async function broadcastPushNotification(params: {
  target: BroadcastPushTarget;
  title: string;
  body: string;
  url?: string | null;
  idSalao?: string | null;
}) {
  const supabase = getDatabaseAdmin();
  const title = String(params.title || "").trim();
  const body = String(params.body || "").trim();
  if (!title || !body) throw new Error("Informe titulo e mensagem.");

  let query = (supabase as any)
    .from("push_subscriptions")
    .select(
      "id, audience, endpoint, p256dh, auth, cliente_app_conta_id, id_profissional"
    )
    .eq("ativo", true);

  if (params.target === "clientes") query = query.eq("audience", "cliente_app");
  else if (params.target === "profissionais") {
    query = query.eq("audience", "profissional_app");
  } else if (params.target === "saloes") {
    query = query.eq("audience", "salao_painel");
  }

  if (params.idSalao) query = query.eq("id_salao", params.idSalao);

  const { data: rows, error } = await query.limit(2000);
  if (error) throw new Error(error.message);

  let subscriptions = (rows || []) as PushSubscriptionRow[];
  if (params.target === "clientes") {
    subscriptions = await filterClienteAppSubscriptionsByPreference(subscriptions);
  }
  if (params.target === "profissionais") {
    subscriptions = await filterProfissionalAppSubscriptionsByPreference(subscriptions);
  }

  return sendPushToRows(subscriptions, {
    title,
    body,
    url: params.url || "/",
    tag: `admin-master-${params.target}-${params.idSalao || "geral"}`,
  });
}

function formatAppointmentDate(date?: string | null, time?: string | null) {
  const dateText = date
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
        new Date(`${date}T12:00:00`)
      )
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
    const supabase = getDatabaseAdmin();
    const [salaoResult, profissionalResult] = await Promise.all([
      (supabase as any)
        .from("push_subscriptions")
        .select("id, audience, endpoint, p256dh, auth")
        .eq("audience", "salao_painel")
        .eq("ativo", true)
        .eq("id_salao", params.idSalao),
      (supabase as any)
        .from("push_subscriptions")
        .select("id, audience, endpoint, p256dh, auth, id_profissional")
        .eq("audience", "profissional_app")
        .eq("ativo", true)
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional),
    ]);

    const body = `${params.clienteNome} quer confirmar ${params.servicoNome} em ${formatAppointmentDate(
      params.data,
      params.horaInicio
    )}. Toque para revisar.`;

    if (
      settings.salaoNovoAgendamentoApp &&
      !salaoResult.error &&
      salaoResult.data?.length
    ) {
      await sendPushToRows(salaoResult.data as PushSubscriptionRow[], {
        title: "Pedido de horário recebido",
        body,
        url: `/agenda?agendamento=${params.idAgendamento}`,
        tag: `agendamento-${params.idAgendamento}`,
      });
    }

    if (!profissionalResult.error && profissionalResult.data?.length) {
      const profissionais = await filterProfissionalAppSubscriptionsByPreference(
        profissionalResult.data as PushSubscriptionRow[]
      );
      await sendPushToRowsSafely(profissionais, {
        title: "Pedido de horário para confirmar",
        body,
        url: `/app-profissional/agenda/${params.idAgendamento}`,
        tag: `agendamento-${params.idAgendamento}`,
      });
    }

    if (await isProfissionalNativePushEnabled(params.idProfissional)) {
      await sendNativePushToAudience({
        audience: "profissional_app",
        idSalao: params.idSalao,
        idProfissional: params.idProfissional,
        payload: {
          title: "Pedido de horário para confirmar",
          body,
          url: `/app-profissional/agenda/${params.idAgendamento}`,
          tag: `agendamento-${params.idAgendamento}`,
        },
      });
    }
  } catch (error) {
    console.error("[push] falha ao notificar novo agendamento", {
      idAgendamento: params.idAgendamento,
      idSalao: params.idSalao,
      message: normalizeErrorMessage(error),
    });
  }
}

export async function notifyClientAppointmentConfirmed(params: {
  idAgendamento: string;
  idSalao: string;
}) {
  try {
    const settings = await loadSalonNotificationSettings(params.idSalao);
    if (!settings.clienteAgendamentoConfirmado) return;

    const supabase = getDatabaseAdmin();
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

    const clientePushEnabled = await isClienteAppPushEnabled(clienteAuth.app_conta_id);
    if (!clientePushEnabled) return;

    const { data: rows, error: rowsError } = await (supabase as any)
      .from("push_subscriptions")
      .select("id, audience, endpoint, p256dh, auth")
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
      body: `${servico?.nome || "Seu horário"} foi confirmado para ${formatAppointmentDate(
        agendamento.data,
        agendamento.hora_inicio
      )}. Nos vemos em breve.`,
      url: "/app-cliente/agendamentos",
      tag: `agendamento-confirmado-${params.idAgendamento}`,
    });
  } catch (error) {
    console.error("[push] falha ao notificar confirmacao do cliente", {
      idAgendamento: params.idAgendamento,
      idSalao: params.idSalao,
      message: normalizeErrorMessage(error),
    });
  }
}
