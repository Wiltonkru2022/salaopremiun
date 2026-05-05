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
  const idSalao = String(formData.get("salao") || "").trim();
  const nome = String(formData.get("nome") || "");
  const telefone = String(formData.get("telefone") || "");
  const email = String(formData.get("email") || "");
  const senha = String(formData.get("senha") || "");

  if (!idSalao) {
    return { error: "Escolha um salao antes de criar sua conta." };
  }

  const result = await createClienteAppAccount({
    idSalao,
    nome,
    telefone,
    email,
    senha,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  await createClienteSession(result.session);
  redirect("/app-cliente/agendamentos");
}
