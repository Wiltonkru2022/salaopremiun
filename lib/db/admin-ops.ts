import "server-only";
import { getDatabaseAdmin, type DatabaseAdminClient } from "@/lib/db/admin";

type AdminOperationParams<T> = {
  action: string;
  actorId?: string | null;
  idSalao?: string | null;
  run: (client: DatabaseAdminClient) => Promise<T>;
};

export async function runAdminOperation<T>({
  action,
  actorId,
  idSalao,
  run,
}: AdminOperationParams<T>): Promise<T> {
  if (!action?.trim()) {
    throw new Error("Acao administrativa nao informada.");
  }

  try {
    return await run(getDatabaseAdmin());
  } catch (error) {
    console.error("[DB_ADMIN_OP_ERROR]", {
      action,
      actorId: actorId ?? null,
      idSalao: idSalao ?? null,
      error: error instanceof Error ? error.message : "erro_desconhecido",
    });
    throw error;
  }
}
