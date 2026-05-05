"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { createClienteAppAccount } from "@/app/services/cliente-app/auth";

export type CadastroClienteState = {
  error: string | null;
};

export async function cadastroClienteAction(
  _prevState: CadastroClienteState,
  formData: FormData
): Promise<CadastroClienteState> {
  const nome = String(formData.get("nome") || "");
  const telefone = String(formData.get("telefone") || "");
  const email = String(formData.get("email") || "");
  const senha = String(formData.get("senha") || "");
  const next = String(formData.get("next") || "").trim();

  const result = await createClienteAppAccount({
    nome,
    telefone,
    email,
    senha,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  await createClienteSession(result.session);
  redirect(next || "/app-cliente/inicio");
}
