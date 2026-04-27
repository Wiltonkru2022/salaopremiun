import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bloqueio,
  DiaTrabalhoProfissional,
  PausaProfissional,
  TimeSlot,
} from "@/types/agenda";

export function normalizeTimeString(time: string | null | undefined) {
  if (!time) return "00:00";

  const raw = String(time).trim();
  if (!raw) return "00:00";

  const parts = raw.split(":");
  const hh = String(parts[0] ?? "0").padStart(2, "0");
  const mm = String(parts[1] ?? "0").padStart(2, "0");

  return `${hh}:${mm}`;
}

export function timeToMinutes(time: string | null | undefined) {
  const normalized = normalizeTimeString(time);
  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(total: number) {
  const safe = Math.max(0, total);
  const hours = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (safe % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function snapMinutes(value: number, step = 15) {
  return Math.round(value / step) * step;
}

export function buildTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): TimeSlot[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const step = Math.max(Number(intervalMinutes || 15), 5);

  const slots: TimeSlot[] = [];

  for (let current = start; current < end; current += step) {
    slots.push({
      time: minutesToTime(current),
      minutes: current,
    });
  }

  return slots;
}

export function getWeekDays(baseDate: Date) {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 });
  const end = endOfWeek(baseDate, { weekStartsOn: 1 });

  const days: Date[] = [];
  let current = start;

  while (current <= end) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export function formatDayLabel(date: Date) {
  return format(date, "EEEE dd/MM", { locale: ptBR });
}

export function formatFullDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function addDurationToTime(
  time: string | null | undefined,
  durationMinutes: number
) {
  const start = timeToMinutes(time);
  return minutesToTime(start + Number(durationMinutes || 0));
}

export function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);

  return a1 < b2 && a2 > b1;
}

export function getStatusStyles(status: string) {
  switch (status) {
    case "confirmado":
      return {
        card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-white text-emerald-950",
        badge: "border border-emerald-200 bg-emerald-100 text-emerald-700",
      };

    case "pendente":
      return {
        card: "border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white text-amber-950",
        badge: "border border-amber-200 bg-amber-100 text-amber-700",
      };

    case "atendido":
      return {
        card: "border-sky-200 bg-gradient-to-br from-sky-50 via-sky-50 to-white text-sky-950",
        badge: "border border-sky-200 bg-sky-100 text-sky-700",
      };

    case "cancelado":
      return {
        card: "border-rose-200 bg-gradient-to-br from-rose-50 via-rose-50 to-white text-rose-950 opacity-95",
        badge: "border border-rose-200 bg-rose-100 text-rose-700",
      };

    case "aguardando_pagamento":
      return {
        card: "border-violet-200 bg-gradient-to-br from-violet-50 via-violet-50 to-white text-violet-950",
        badge: "border border-violet-200 bg-violet-100 text-violet-700",
      };

    case "bloqueado":
      return {
        card: "border-zinc-300 bg-gradient-to-br from-zinc-100 via-zinc-50 to-white text-zinc-800",
        badge: "border border-zinc-200 bg-zinc-100 text-zinc-700",
      };

    default:
      return {
        card: "border-zinc-300 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 text-zinc-900",
        badge: "border border-zinc-200 bg-zinc-100 text-zinc-700",
      };
  }
}

export function isTodayDate(date: Date) {
  return isSameDay(date, new Date());
}

export function getDiaSemanaNome(date: Date) {
  const weekNames = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];
  return weekNames[date.getDay()];
}

export function normalizeDiaTexto(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function sanitizeDiasFuncionamento(
  dias: string[] | null | undefined
): string[] {
  if (!Array.isArray(dias)) {
    return ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  }

  return dias.map((d) => normalizeDiaTexto(d));
}

export function isDiaFuncionamento(date: Date, diasFuncionamento: string[]) {
  const dia = getDiaSemanaNome(date);
  return sanitizeDiasFuncionamento(diasFuncionamento).includes(dia);
}

export function parseDiasTrabalho(
  diasTrabalho: DiaTrabalhoProfissional[] | string | null | undefined
): DiaTrabalhoProfissional[] {
  if (!diasTrabalho) return [];

  if (Array.isArray(diasTrabalho)) {
    return diasTrabalho;
  }

  try {
    const parsed = JSON.parse(diasTrabalho);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePausas(
  pausas: PausaProfissional[] | string | null | undefined
): PausaProfissional[] {
  if (!pausas) return [];

  if (Array.isArray(pausas)) {
    return pausas;
  }

  try {
    const parsed = JSON.parse(pausas);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getDiaTrabalhoProfissional(
  date: Date,
  diasTrabalho: DiaTrabalhoProfissional[] | string | null | undefined
) {
  const diasNormalizados = parseDiasTrabalho(diasTrabalho);
  const diaAtual = getDiaSemanaNome(date);

  return (
    diasNormalizados.find(
      (item) => normalizeDiaTexto(item.dia) === diaAtual
    ) || null
  );
}

export function profissionalAtendeNesseDia(
  date: Date,
  diasTrabalho: DiaTrabalhoProfissional[] | string | null | undefined
) {
  const dia = getDiaTrabalhoProfissional(date, diasTrabalho);
  return !!dia?.ativo;
}

export function getHorarioProfissionalNoDia(
  date: Date,
  diasTrabalho: DiaTrabalhoProfissional[] | string | null | undefined
) {
  const dia = getDiaTrabalhoProfissional(date, diasTrabalho);

  if (!dia || !dia.ativo) {
    return null;
  }

  return {
    inicio: normalizeTimeString(dia.inicio),
    fim: normalizeTimeString(dia.fim),
  };
}

export function buildPausasBloqueiosDoProfissional(params: {
  idSalao: string;
  profissionalId: string;
  date: string;
  pausas: PausaProfissional[] | string | null | undefined;
}) {
  const pausasNormalizadas = parsePausas(params.pausas);

  if (!Array.isArray(pausasNormalizadas) || pausasNormalizadas.length === 0) {
    return [];
  }

  return pausasNormalizadas
    .filter((p) => p?.inicio && p?.fim)
    .map((p, index) => {
      const inicio = normalizeTimeString(p.inicio);
      const fim = normalizeTimeString(p.fim);

      return {
        id: `pausa-${params.profissionalId}-${params.date}-${index}`,
        id_salao: params.idSalao,
        profissional_id: params.profissionalId,
        data: params.date,
        hora_inicio: inicio,
        hora_fim: fim,
        motivo: p.descricao || "Pausa",
        origem: "pausa_profissional" as const,
      };
    });
}

export function buildForaExpedienteBloqueiosDoProfissional(params: {
  idSalao: string;
  profissionalId: string;
  date: string;
  agendaInicio: string;
  agendaFim: string;
  diasTrabalho: DiaTrabalhoProfissional[] | string | null | undefined;
}) {
  const dateObj = new Date(`${params.date}T12:00:00`);
  const horario = getHorarioProfissionalNoDia(dateObj, params.diasTrabalho);

  const agendaInicio = normalizeTimeString(params.agendaInicio);
  const agendaFim = normalizeTimeString(params.agendaFim);

  if (!horario) {
    return [
      {
        id: `folga-${params.profissionalId}-${params.date}-0`,
        id_salao: params.idSalao,
        profissional_id: params.profissionalId,
        data: params.date,
        hora_inicio: agendaInicio,
        hora_fim: agendaFim,
        motivo: "Fora do expediente",
        origem: "fora_expediente_profissional" as const,
      },
    ];
  }

  const list: Bloqueio[] = [];

  if (timeToMinutes(agendaInicio) < timeToMinutes(horario.inicio)) {
    list.push({
      id: `fora-${params.profissionalId}-${params.date}-inicio`,
      id_salao: params.idSalao,
      profissional_id: params.profissionalId,
      data: params.date,
      hora_inicio: agendaInicio,
      hora_fim: horario.inicio,
      motivo: "Antes do início do profissional",
      origem: "fora_expediente_profissional",
    });
  }

  if (timeToMinutes(agendaFim) > timeToMinutes(horario.fim)) {
    list.push({
      id: `fora-${params.profissionalId}-${params.date}-fim`,
      id_salao: params.idSalao,
      profissional_id: params.profissionalId,
      data: params.date,
      hora_inicio: horario.fim,
      hora_fim: agendaFim,
      motivo: "Após o fim do profissional",
      origem: "fora_expediente_profissional",
    });
  }

  return list;
}

export function mergeBloqueios(base: Bloqueio[], extras: Bloqueio[]) {
  const map = new Map<string, Bloqueio>();

  [...base, ...extras].forEach((item) => {
    const key = `${item.id}-${item.data}-${item.hora_inicio}-${item.hora_fim}`;
    map.set(key, item);
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio);
  });
}

export function buildWhatsappConfirmacaoText(params: {
  nomeCliente?: string | null;
  nomeServico?: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  nomeProfissional?: string | null;
}) {
  return `Olá${params.nomeCliente ? `, ${params.nomeCliente}` : ""}! Seu agendamento foi confirmado.

Serviço: ${params.nomeServico || "-"}
Data: ${params.data}
Horário: ${normalizeTimeString(params.horaInicio)} às ${normalizeTimeString(params.horaFim)}
Profissional: ${params.nomeProfissional || "-"}

Aguardamos você.`;
}

export function buildWhatsappCancelamentoText(params: {
  nomeCliente?: string | null;
  nomeServico?: string | null;
  data: string;
  horaInicio: string;
  nomeProfissional?: string | null;
}) {
  return `Olá${params.nomeCliente ? `, ${params.nomeCliente}` : ""}. Seu agendamento foi cancelado.

Serviço: ${params.nomeServico || "-"}
Data: ${params.data}
Horário: ${normalizeTimeString(params.horaInicio)}
Profissional: ${params.nomeProfissional || "-"}

Se desejar, podemos remarcar um novo horário.`;
}
