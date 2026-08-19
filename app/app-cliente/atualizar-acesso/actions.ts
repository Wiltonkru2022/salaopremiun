"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { completeClienteIdentityMigration } from "@/app/services/cliente-app/identity-migration";
import { normalizeSafeInternalPath } from "@/lib/security/safe-next-path";

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
  const next = normalizeSafeInternalPath(
    formData.get("next"),
    "/app-cliente",
    "/app-cliente/inicio"
  );
  redirect(next);
}
