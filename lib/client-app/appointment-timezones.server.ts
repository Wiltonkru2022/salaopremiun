import "server-only";

import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  DEFAULT_SALON_TIME_ZONE,
  normalizeSalonTimeZone,
  type SalonTimeZone,
} from "@/lib/timezones";

export async function getSalonTimeZoneMap(
  salonIds: Array<string | null | undefined>
): Promise<Map<string, SalonTimeZone>> {
  const ids = Array.from(
    new Set(salonIds.map((value) => String(value || "").trim()).filter(Boolean))
  );
  const result = new Map<string, SalonTimeZone>();

  ids.forEach((id) => result.set(id, DEFAULT_SALON_TIME_ZONE));
  if (!ids.length) return result;

  const { data, error } = await (getDatabaseAdmin() as any)
    .from("configuracoes_salao")
    .select("id_salao, fuso_horario")
    .in("id_salao", ids)
    .limit(ids.length);

  if (error) return result;

  for (const row of (data || []) as Array<{
    id_salao?: string | null;
    fuso_horario?: string | null;
  }>) {
    const id = String(row.id_salao || "").trim();
    if (id) result.set(id, normalizeSalonTimeZone(row.fuso_horario));
  }

  return result;
}
