"use server";

import { recoverClienteAppAccess } from "@/app/services/cliente-app/recovery";

export type RecoverClienteAccessState = {
  error: string | null;
  success: string | null;
};

export async function recoverClienteAccessAction(
  _prevState: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const email = String(formData.get("email") || "");
  const telefone = String(formData.get("telefone") || "");
  const senha = String(formData.get("senha") || "");
  const confirmacao = String(formData.get("confirmacao") || "");

  const result = await recoverClienteAppAccess({
    email,
    telefone,
    senha,
    confirmacao,
  });

  if (!result.ok) {
    return {
      error: result.error,
      success: null,
    };
  }

  return {
    error: null,
    success: result.message,
  };
}
