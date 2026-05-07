"use server";

import { headers } from "next/headers";
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
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;
  const userAgent = headerStore.get("user-agent") || null;

  const result = await resetClienteAppPasswordWithToken({
    token,
    senha,
    confirmacao,
    ip,
    userAgent,
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
