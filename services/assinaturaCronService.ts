import type { DatabaseClient } from "@/lib/db/types";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { executarCronRenovacaoAssinaturas } from "@/lib/assinaturas/renewal-service";
import { getDatabaseAdmin } from "@/lib/db/admin";

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

    criarDatabaseAdmin() {
      return getDatabaseAdmin();
    },

    async executarRenovacao(databaseAdmin: DatabaseClient) {
      return executarCronRenovacaoAssinaturas(databaseAdmin);
    },

    async reportarFalhaCron(params: {
      databaseAdmin: DatabaseClient | null;
      error: unknown;
    }) {
      if (!params.databaseAdmin) {
        return;
      }

      await reportOperationalIncident({
        databaseAdmin: params.databaseAdmin,
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
