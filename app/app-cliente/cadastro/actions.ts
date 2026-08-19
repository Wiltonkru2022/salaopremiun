"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { createClienteAppAccount } from "@/app/services/cliente-app/auth";
import { normalizeSafeInternalPath } from "@/lib/security/safe-next-path";

export type CadastroClienteState = { error: string | null };

export async function cadastroClienteAction(
  _prevState: CadastroClienteState,
  formData: FormData
): Promise<CadastroClienteState> {
  const nome = String(formData.get("nome") || "");
  const dataNascimento = String(formData.get("dataNascimento") || "");
  const cpf = String(formData.get("cpf") || "");
  const whatsapp = String(formData.get("whatsapp") || "");
  const email = String(formData.get("email") || "");
  const next = normalizeSafeInternalPath(
    formData.get("next"),
    "/app-cliente",
    "/app-cliente/inicio"
  );

  const result = await createClienteAppAccount({
    nome,
    dataNascimento,
    cpf,
    whatsapp,
    email,
  });

  if (!result.ok) return { error: result.error };

  await createClienteSession(result.session);
  redirect(next);
}
