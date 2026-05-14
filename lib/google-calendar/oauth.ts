import { getSupabaseAdmin } from "@/lib/supabase/admin";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

export type GoogleCalendarConnection = {
  id_salao: string;
  google_email: string | null;
  calendar_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  ativo: boolean | null;
};

export function getGoogleCalendarEnv() {
  return {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret:
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      "",
    redirectUri:
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      "https://painel.salaopremiun.com.br/api/integracoes/google-calendar/callback",
  };
}

export function isGoogleCalendarConfigured() {
  const env = getGoogleCalendarEnv();
  return Boolean(env.clientId && env.clientSecret && env.redirectUri);
}

export async function getGoogleCalendarConnection(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from("saloes_google_calendar_connections")
    .select("id_salao, google_email, calendar_id, access_token, refresh_token, expires_at, ativo")
    .eq("id_salao", idSalao)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao carregar conexão Google Calendar.");
  }

  return (data as GoogleCalendarConnection | null) ?? null;
}

export async function refreshGoogleCalendarAccessToken(
  connection: GoogleCalendarConnection
) {
  if (!connection.refresh_token) {
    throw new Error("Conexão Google Calendar sem token de renovação.");
  }

  const env = getGoogleCalendarEnv();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string }
    | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || "Google não renovou o acesso.");
  }

  const expiresAt = new Date(Date.now() + Number(data.expires_in || 3300) * 1000);
  await (getSupabaseAdmin() as any)
    .from("saloes_google_calendar_connections")
    .update({
      access_token: data.access_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id_salao", connection.id_salao);

  return data.access_token;
}

export async function getValidGoogleCalendarAccessToken(
  connection: GoogleCalendarConnection
) {
  const expiresAt = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : 0;

  if (connection.access_token && expiresAt > Date.now() + 60_000) {
    return connection.access_token;
  }

  return refreshGoogleCalendarAccessToken(connection);
}

export async function upsertGoogleCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId?: string | null;
  event: Record<string, unknown>;
}) {
  const calendarId = encodeURIComponent(params.calendarId || "primary");
  const createEndpoint = `${GOOGLE_EVENTS_URL}/${calendarId}/events`;

  async function sendGoogleEvent(endpoint: string, method: "PATCH" | "POST") {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.event),
    });

    const data = (await response.json().catch(() => null)) as
      | { id?: string; error?: { message?: string } }
      | null;

    return { response, data };
  }

  if (params.eventId) {
    const updateEndpoint = `${GOOGLE_EVENTS_URL}/${calendarId}/events/${encodeURIComponent(
      params.eventId
    )}`;
    const { response, data } = await sendGoogleEvent(updateEndpoint, "PATCH");

    if (response.ok && data?.id) {
      return data.id;
    }

    const message = data?.error?.message || "";
    const eventWasRemoved =
      response.status === 404 ||
      response.status === 410 ||
      message.toLowerCase().includes("not found");

    if (!eventWasRemoved) {
      throw new Error(message || "Google nao aceitou o evento.");
    }
  }

  const { response, data } = await sendGoogleEvent(createEndpoint, "POST");

  if (!response.ok || !data?.id) {
    throw new Error(data?.error?.message || "Google nao aceitou o evento.");
  }

  return data.id;
}
