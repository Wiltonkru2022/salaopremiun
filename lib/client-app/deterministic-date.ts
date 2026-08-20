import { normalizeSalonTimeZone } from "@/lib/timezones";

function datePartsInTimeZone(value: string, timeZone?: string | null) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeSalonTimeZone(timeZone),
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
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) {
    return null;
  }

  return parts;
}

/**
 * Converts an absolute instant into a timezone-local ISO-like value without an offset.
 * ClientAppointmentsManager parses this value as local time on both SSR and hydration,
 * so the visible text is identical even when Node and the browser use different TZs.
 */
export function toDeterministicSalonLocalDateTime(
  value?: string | null,
  timeZone?: string | null
) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const parts = datePartsInTimeZone(normalized, timeZone);
  if (!parts) return null;

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second || "00"}`;
}

export function formatHydrationSafeLocalDateTime(value?: string | null) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
