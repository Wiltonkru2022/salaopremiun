"use server";

import { requestClienteAppRecovery } from "@/app/services/cliente-app/recovery";

export type RecoverClienteAccessState = {
  error: string | null;
  success: string | null;
};

export async function requestClienteRecoveryLinkAction(
  _prevState: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const email = String(formData.get("email") || "");
  const result = await requestClienteAppRecovery(email);

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
