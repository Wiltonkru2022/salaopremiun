import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { executarCronRenovacaoAssinaturas } from "@/lib/assinaturas/renewal-service";

export class AssinaturaCronServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "AssinaturaCronServiceError";
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
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
