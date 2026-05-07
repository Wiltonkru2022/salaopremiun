"use server";

import { resetClienteAppPasswordWithToken } from "@/app/services/cliente-app/recovery";

export type ResetClientePasswordState = {
  error: string | null;
  success: string | null;
};

export async function resetClientePasswordAction(
  _prevState: ResetClientePasswordState,
  formData: FormData
): Promise<ResetClientePasswordState> {
  const token = String(formData.get("token") || "");
  const senha = String(formData.get("senha") || "");
  const confirmacao = String(formData.get("confirmacao") || "");

  const result = await resetClienteAppPasswordWithToken({
    token,
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
