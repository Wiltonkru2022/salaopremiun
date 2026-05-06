import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
};

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

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

async function sendToRows(rows: PushSubscriptionRow[], payload: PushPayload) {
  const config = getPushConfig();
  if (!config || !rows.length) return;

  const webPush = await import("web-push");
  webPush.default.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey
  );

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webPush.default.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 }
        );
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

    const body = `${params.clienteNome} pediu ${params.servicoNome} em ${formatAppointmentDate(
      params.data,
      params.horaInicio
    )}.`;

    if (!salaoResult.error && salaoResult.data?.length) {
      await sendToRows(salaoResult.data as PushSubscriptionRow[], {
        title: "Novo agendamento no app cliente",
        body,
        url: `/agenda?agendamento=${params.idAgendamento}`,
        tag: `agendamento-${params.idAgendamento}`,
      });
    }

    if (!profissionalResult.error && profissionalResult.data?.length) {
      await sendToRows(profissionalResult.data as PushSubscriptionRow[], {
        title: "Novo agendamento para confirmar",
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

    await sendToRows(rows as PushSubscriptionRow[], {
      title: "Agendamento confirmado",
      body: `${servico?.nome || "Seu horario"} foi confirmado para ${formatAppointmentDate(
        agendamento.data,
        agendamento.hora_inicio
      )}.`,
      url: "/app-cliente/agendamentos",
      tag: `agendamento-confirmado-${params.idAgendamento}`,
    });
  } catch {
    // Confirmacao da agenda nao pode depender do push.
  }
}
