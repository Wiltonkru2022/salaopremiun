"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { loginClienteAppByEmailSenha } from "@/app/services/cliente-app/auth";

export type LoginClienteState = {
  error: string | null;
};

export async function loginClienteAction(
  _prevState: LoginClienteState,
  formData: FormData
): Promise<LoginClienteState> {
  const email = String(formData.get("email") || "");
  const senha = String(formData.get("senha") || "");
  const idSalao = String(formData.get("salao") || "").trim() || null;

  const result = await loginClienteAppByEmailSenha({
    email,
    senha,
    idSalao,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  await createClienteSession(result.session);
  redirect("/app-cliente/agendamentos");
}
