import { NextRequest, NextResponse } from "next/server";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { z, ZodError } from "zod";
import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
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
  clientes?: { nome?: string | null; whatsapp?: string | null } | null;
  profissionais?: { nome?: string | null; nome_exibicao?: string | null } | null;
  servicos?: { nome?: string | null; preco?: number | string | null } | null;
};

function escapeIcsText(value: unknown) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toGoogleCalendarDate(value: string, time: string) {
  const date = String(value || "").slice(0, 10).replace(/-/g, "");
  const [hour = "00", minute = "00"] = String(time || "00:00").split(":");
  return `${date}T${hour.padStart(2, "0")}${minute.padStart(2, "0")}00`;
}

function getPeriod(viewMode: "day" | "week", data: string) {
  const date = new Date(`${data}T12:00:00`);
  const start = viewMode === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : date;
  const end = viewMode === "week" ? endOfWeek(date, { weekStartsOn: 1 }) : date;

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

function buildIcs(params: {
  idSalao: string;
  profissionalId: string;
  periodStart: string;
  periodEnd: string;
  rows: AppointmentRow[];
}) {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SalaoPremium//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SalaoPremium - Agenda profissional",
  ];

  params.rows.forEach((row) => {
    const clienteNome = row.clientes?.nome || "Cliente";
    const servicoNome = row.servicos?.nome || "Atendimento";
    const profissionalNome =
      row.profissionais?.nome_exibicao || row.profissionais?.nome || "Profissional";
    const summary = `${servicoNome} - ${clienteNome}`;
    const description = [
      `Cliente: ${clienteNome}`,
      `Profissional: ${profissionalNome}`,
      row.clientes?.whatsapp ? `WhatsApp: ${row.clientes.whatsapp}` : "",
      row.observacoes ? `Observações: ${row.observacoes}` : "",
      "Sincronizado pelo Salão Premium.",
    ]
      .filter(Boolean)
      .join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${row.id}@salaopremiun.com.br`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=America/Sao_Paulo:${toGoogleCalendarDate(row.data, row.hora_inicio)}`,
      `DTEND;TZID=America/Sao_Paulo:${toGoogleCalendarDate(row.data, row.hora_fim)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = payloadSchema.parse(await req.json());
    await requireSalaoAnyPermission(body.idSalao, ["agenda_ver", "agenda_editar"]);

    const period = getPeriod(body.viewMode, body.data);
    const supabase = getSupabaseAdmin();

    const { data, error } = await (supabase as any)
      .from("agendamentos")
      .select(
        "id, data, hora_inicio, hora_fim, observacoes, status, clientes(nome, whatsapp), profissionais(nome, nome_exibicao), servicos(nome, preco)"
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

    const rows = ((data || []) as AppointmentRow[]).filter(
      (item) => item.data && item.hora_inicio && item.hora_fim
    );
    const ids = rows.map((item) => item.id);

    if (ids.length) {
      await (supabase as any)
        .from("agendamentos")
        .update({
          google_calendar_sync_status: "sincronizado",
          google_calendar_synced_at: new Date().toISOString(),
        })
        .in("id", ids)
        .eq("id_salao", body.idSalao);
    }

    const ics = buildIcs({
      idSalao: body.idSalao,
      profissionalId: body.profissionalId,
      periodStart: period.start,
      periodEnd: period.end,
      rows,
    });

    const googleCalendarUrl = "https://calendar.google.com/calendar/u/0/r/settings/export";
    const fileName =
      body.viewMode === "week"
        ? `salaopremium-agenda-${period.start}-a-${period.end}.ics`
        : `salaopremium-agenda-${period.start}.ics`;

    return NextResponse.json({
      ok: true,
      total: rows.length,
      period,
      fileName,
      googleCalendarUrl,
      ics,
      nextSuggestion:
        rows.length > 0
          ? "Arquivo pronto para importar no Google Agenda."
          : "Nenhum atendimento confirmado neste período.",
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
            : "Erro ao preparar integração com Google Agenda.",
      },
      { status: 500 }
    );
  }
}
