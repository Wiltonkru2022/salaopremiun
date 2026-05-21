export const DEFAULT_SALON_TIME_ZONE = "America/Sao_Paulo";

export const SALON_TIME_ZONE_OPTIONS = [
  {
    value: "America/Sao_Paulo",
    label: "Brasilia, Sao Paulo, Rio de Janeiro",
  },
  {
    value: "America/Campo_Grande",
    label: "Campo Grande, Mato Grosso do Sul",
  },
  {
    value: "America/Cuiaba",
    label: "Cuiaba, Mato Grosso",
  },
  {
    value: "America/Manaus",
    label: "Manaus, Amazonas",
  },
  {
    value: "America/Belem",
    label: "Belem, Para",
  },
  {
    value: "America/Fortaleza",
    label: "Fortaleza, Ceara",
  },
  {
    value: "America/Rio_Branco",
    label: "Rio Branco, Acre",
  },
] as const;

export type SalonTimeZone = (typeof SALON_TIME_ZONE_OPTIONS)[number]["value"];

const SALON_TIME_ZONE_VALUES = new Set<string>(
  SALON_TIME_ZONE_OPTIONS.map((option) => option.value)
);

export function normalizeSalonTimeZone(value?: string | null): SalonTimeZone {
  const parsed = String(value || "").trim();
  return SALON_TIME_ZONE_VALUES.has(parsed)
    ? (parsed as SalonTimeZone)
    : DEFAULT_SALON_TIME_ZONE;
}

export function localTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return new Date("invalid");
  }

  const safeTimeZone = normalizeSalonTimeZone(timeZone);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(utcGuess))
      .map((part) => [part.type, part.value])
  );
  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = zonedAsUtc - utcGuess;

  return new Date(utcGuess - offset);
}
