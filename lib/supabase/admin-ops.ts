import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

type AdminOperationParams<T> = {
  action: string;
  actorId?: string | null;
  idSalao?: string | null;
  run: (client: AdminClient) => Promise<T>;
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

  const client = getSupabaseAdmin();

  try {
    return await run(client);
  } catch (error) {
    console.error("[ADMIN_OP_ERROR]", {
      action,
      actorId: actorId ?? null,
      idSalao: idSalao ?? null,
      error: error instanceof Error ? error.message : "erro_desconhecido",
    });
    throw error;
  }
}
