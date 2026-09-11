import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { executarCronRenovacaoAssinaturas } from "@/lib/assinaturas/renewal-service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class AssinaturaCronServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "AssinaturaCronServiceError";
  }
}

export function createAssinaturaCronService() {
  return {
    validarCron(authorizationHeader: string | null) {
      return verifyBearerSecret(authorizationHeader, process.env.CRON_SECRET);
    },

    criarSupabaseAdmin() {
      return getSupabaseAdmin();
    },

    async executarRenovacao(supabaseAdmin: SupabaseClient) {
      return executarCronRenovacaoAssinaturas(supabaseAdmin);
    },

    async reportarFalhaCron(params: {
      supabaseAdmin: SupabaseClient | null;
      error: unknown;
    }) {
      if (!params.supabaseAdmin) {
        return;
      }

      await reportOperationalIncident({
        supabaseAdmin: params.supabaseAdmin,
        key: "cron:renovar-assinaturas:erro",
        module: "cron_renovacao_assinaturas",
        title: "Cron de renovacao de assinaturas falhou",
        description:
          params.error instanceof Error
            ? params.error.message
            : "Erro ao renovar assinaturas.",
        severity: "critica",
        details: {
          route: "/api/cron/renovar-assinaturas",
        },
      });
    },
  };
}

export type AssinaturaCronService = ReturnType<typeof createAssinaturaCronService>;
