import { recalcularTaxaProfissional } from "@/lib/comissoes/recalcular-taxa-profissional";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export function createComissaoTaxaService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    recalcular(params: { idSalao: string; idComanda: string }) {
      return recalcularTaxaProfissional({
        supabaseAdmin,
        idSalao: params.idSalao,
        idComanda: params.idComanda,
      });
    },
  };
}

export type ComissaoTaxaService = ReturnType<typeof createComissaoTaxaService>;
