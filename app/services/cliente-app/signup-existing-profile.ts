import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeCpf, normalizeWhatsapp } from "@/lib/client-app/identity";
import {
  findClienteRowsByCpf,
  findClienteRowsByNormalizedPhone,
} from "@/app/services/cliente-app/linking";

export async function detectExistingSalonClientForSignup(params: {
  cpf: string;
  whatsapp: string;
}) {
  const cpf = normalizeCpf(params.cpf);
  const whatsapp = normalizeWhatsapp(params.whatsapp);
  if (!cpf && !whatsapp) return { found: false as const };

  const supabaseAdmin = getSupabaseAdmin();

  if (cpf) {
    const byCpf = await findClienteRowsByCpf({ supabaseAdmin, cpf, limit: 20 });
    if (!byCpf.error && byCpf.data.length) {
      return {
        found: true as const,
        reason: "cpf" as const,
        matches: byCpf.data.length,
      };
    }
  }

  if (whatsapp) {
    const byPhone = await findClienteRowsByNormalizedPhone({
      supabaseAdmin,
      telefone: whatsapp,
      limit: 50,
    });
    if (!byPhone.error) {
      const safeRows = byPhone.data.filter((row) => {
        const existingCpf = normalizeCpf(row.cpf);
        return !existingCpf || !cpf || existingCpf === cpf;
      });
      if (safeRows.length) {
        return {
          found: true as const,
          reason: "whatsapp" as const,
          matches: safeRows.length,
        };
      }
    }
  }

  return { found: false as const };
}
