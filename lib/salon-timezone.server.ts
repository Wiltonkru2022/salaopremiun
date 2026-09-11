import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_SALON_TIME_ZONE,
  normalizeSalonTimeZone,
  type SalonTimeZone,
} from "@/lib/timezones";

export async function getSalonTimeZone(
  idSalao?: string | null
): Promise<SalonTimeZone> {
  const id = String(idSalao || "").trim();
  if (!id) return DEFAULT_SALON_TIME_ZONE;

  const { data, error } = await (getSupabaseAdmin() as any)
    .from("configuracoes_salao")
    .select("fuso_horario")
    .eq("id_salao", id)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    if (
      message.includes("fuso_horario") ||
      message.includes("configuracoes_salao") ||
      message.includes("does not exist") ||
      message.includes("schema cache")
    ) {
      return DEFAULT_SALON_TIME_ZONE;
    }

    throw new Error(error.message);
  }

  return normalizeSalonTimeZone(data?.fuso_horario);
}
