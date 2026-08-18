"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { completeClienteMigrationToken } from "@/app/services/cliente-app/migration-links";

export type MigrationTokenState = { error: string | null };

export async function completeClienteMigrationTokenAction(
  _prev: MigrationTokenState,
  formData: FormData
): Promise<MigrationTokenState> {
  const token = String(formData.get("token") || "");
  const result = await completeClienteMigrationToken({
    token,
    cpf: String(formData.get("cpf") || ""),
    dataNascimento: String(formData.get("dataNascimento") || ""),
    whatsapp: String(formData.get("whatsapp") || ""),
  });
  if (!result.ok) return { error: result.error };
  await createClienteSession(result.session);
  redirect("/app-cliente/agendamentos?status=acesso_atualizado");
}
