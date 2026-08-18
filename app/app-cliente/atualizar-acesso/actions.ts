"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { completeClienteIdentityMigration } from "@/app/services/cliente-app/identity-migration";

export type CompleteIdentityState = { error: string | null };

export async function completeClienteIdentityAction(
  _prevState: CompleteIdentityState,
  formData: FormData
): Promise<CompleteIdentityState> {
  const context = await requireClienteAppContext();
  const result = await completeClienteIdentityMigration({
    idConta: context.idConta,
    cpf: String(formData.get("cpf") || ""),
    dataNascimento: String(formData.get("dataNascimento") || ""),
    whatsapp: String(formData.get("whatsapp") || ""),
  });
  if (!result.ok) return { error: result.error };

  await createClienteSession(result.session);
  const next = String(formData.get("next") || "").trim();
  redirect(next || "/app-cliente/agendamentos");
}
