import { recalcularTaxaProfissional } from "@/lib/comissoes/recalcular-taxa-profissional";
import { getDatabaseAdmin } from "@/lib/db/admin";

type DatabaseAdminClient = ReturnType<typeof getDatabaseAdmin>;

export function createComissaoTaxaService(
  supabaseAdmin: DatabaseAdminClient = getDatabaseAdmin()
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
