"use server";

import { redirect } from "next/navigation";
import { createProfissionalSession } from "@/lib/profissional-auth.server";
import { loginProfissionalByCpfSenha } from "@/app/services/profissional/auth";

export type LoginProfissionalState = {
  error: string | null;
};

export async function loginProfissionalAction(
  _prevState: LoginProfissionalState,
  formData: FormData
): Promise<LoginProfissionalState> {
  const cpf = String(formData.get("cpf") || "");
  const senha = String(formData.get("senha") || "").trim();

  const result = await loginProfissionalByCpfSenha(cpf, senha);

  if (!result.ok) {
    return { error: result.error };
  }

  await createProfissionalSession(result.session);

  redirect("/app-profissional/inicio");
}