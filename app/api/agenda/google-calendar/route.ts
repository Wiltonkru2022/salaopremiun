import { NextRequest, NextResponse } from "next/server";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { z, ZodError } from "zod";
import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import {
  getGoogleCalendarConnection,
  getValidGoogleCalendarAccessToken,
  isGoogleCalendarConfigured,
  upsertGoogleCalendarEvent,
} from "@/lib/google-calendar/oauth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  idSalao: z.string().uuid(),
  profissionalId: z.string().uuid(),
  viewMode: z.enum(["day", "week"]),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type AppointmentRow = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  observacoes?: string | null;
  status?: string | null;
  google_calendar_event_id?: string | null;
  clientes?: { nome?: string | null; whatsapp?: string | null } | null;
  profissionais?: { nome?: string | null; nome_exibicao?: string | null } | null;
  servicos?: { nome?: string | null; preco?: number | string | null } | null;
};

function getPeriod(viewMode: "day" | "week", data: string) {
  const date = new Date(`${data}T12:00:00`);
  const start = viewMode === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : date;
  const end = viewMode === "week" ? endOfWeek(date, { weekStartsOn: 1 }) : date;

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

function toGoogleDateTime(date: string, time: string) {
  return `${date}T${String(time || "00:00").slice(0, 5)}:00-04:00`;
}

function buildGoogleEvent(row: AppointmentRow) {
  const clienteNome = row.clientes?.nome || "Cliente";
  const servicoNome = row.servicos?.nome || "Atendimento";
  const profissionalNome =
    row.profissionais?.nome_exibicao || row.profissionais?.nome || "Profissional";

  return {
    summary: `${servicoNome} - ${clienteNome}`,
    description: [
      `Cliente: ${clienteNome}`,
      `Profissional: ${profissionalNome}`,
      row.clientes?.whatsapp ? `WhatsApp: ${row.clientes.whatsapp}` : "",
      row.observacoes ? `Observações: ${row.observacoes}` : "",
      "Sincronizado automaticamente pelo Salão Premium.",
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: toGoogleDateTime(row.data, row.hora_inicio),
      timeZone: "America/Campo_Grande",
    },
    end: {
      dateTime: toGoogleDateTime(row.data, row.hora_fim),
      timeZone: "America/Campo_Grande",
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = payloadSchema.parse(await req.json());
    await requireSalaoAnyPermission(body.idSalao, ["agenda_ver", "agenda_editar"]);

    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          requiresConfig: true,
          error:
            "Google Calendar ainda não está configurado. Cadastre GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET e GOOGLE_CALENDAR_REDIRECT_URI na produção.",
        },
        { status: 409 }
      );
    }

    const connection = await getGoogleCalendarConnection(body.idSalao);
    if (!connection) {
      return NextResponse.json(
        {
          ok: false,
          requiresConnection: true,
          connectUrl: "/api/integracoes/google-calendar/connect",
          error:
            "Conecte a conta Google do salão antes de sincronizar a agenda automaticamente.",
        },
        { status: 409 }
      );
    }

    const period = getPeriod(body.viewMode, body.data);
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as any)
      .from("agendamentos")
      .select(
        "id, data, hora_inicio, hora_fim, observacoes, status, google_calendar_event_id, clientes(nome, whatsapp), profissionais(nome, nome_exibicao), servicos(nome, preco)"
      )
      .eq("id_salao", body.idSalao)
      .eq("profissional_id", body.profissionalId)
      .eq("status", "confirmado")
      .gte("data", period.start)
      .lte("data", period.end)
      .order("data", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) {
      throw new Error(error.message || "Erro ao buscar agenda confirmada.");
    }

    const rows = ((data || []) as unknown as AppointmentRow[]).filter(
      (item) => item.data && item.hora_inicio && item.hora_fim
    );

    if (!rows.length) {
      return NextResponse.json({
        ok: true,
        total: 0,
        period,
        nextSuggestion: "Nenhum atendimento confirmado neste período.",
      });
    }

    const accessToken = await getValidGoogleCalendarAccessToken(connection);
    let synced = 0;

    for (const row of rows) {
      const eventId = await upsertGoogleCalendarEvent({
        accessToken,
        calendarId: connection.calendar_id || "primary",
        eventId: row.google_calendar_event_id,
        event: buildGoogleEvent(row),
      });

      await (supabase as any)
        .from("agendamentos")
        .update({
          google_calendar_event_id: eventId,
          google_calendar_sync_status: "sincronizado",
          google_calendar_synced_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("id_salao", body.idSalao);

      synced += 1;
    }

    return NextResponse.json({
      ok: true,
      total: synced,
      period,
      googleEmail: connection.google_email,
      nextSuggestion: `${synced} atendimento(s) sincronizado(s) automaticamente com o Google Calendar.`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    if (error instanceof AuthzError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar com Google Calendar.",
      },
      { status: 500 }
    );
  }
}
