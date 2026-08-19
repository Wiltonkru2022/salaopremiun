"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import {
  confirmClienteEmailChange,
  confirmClienteRecoveryCodeByEmail,
  confirmClienteRecoveryCodeByIdentity,
  requestClienteEmailChangeCode,
  requestClienteRecoveryCodeByEmail,
  requestClienteRecoveryCodeByIdentity,
  startClienteRecoveryByIdentity,
} from "@/app/services/cliente-app/recovery";

export type RecoverClienteAccessState = {
  error: string | null;
  success: string | null;
  step:
    | "choose"
    | "email-code"
    | "identity-email"
    | "identity-code"
    | "change-email"
    | "change-email-code";
  token?: string | null;
  email?: string | null;
};

const EMAIL_PROVIDER_ERROR =
  "Não foi possível enviar o código por e-mail agora. Tente novamente em alguns minutos.";

function reportRecoveryError(context: string, error: unknown) {
  console.error(`[cliente-app-recovery] ${context}`, {
    message: error instanceof Error ? error.message : "erro_desconhecido",
  });
}

async function requestMetadata() {
  const h = await headers();
  return {
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null,
    userAgent: h.get("user-agent") || null,
  };
}

export async function requestClienteRecoveryEmailAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const email = String(formData.get("email") || "");
  try {
    const result = await requestClienteRecoveryCodeByEmail({
      email,
      ...(await requestMetadata()),
    });
    if (!result.ok) return { error: result.error, success: null, step: "choose" };
    return {
      error: null,
      success: result.message,
      step: "email-code",
      email: email.trim().toLowerCase(),
    };
  } catch (error) {
    reportRecoveryError("falha ao solicitar recuperação por e-mail", error);
    return { error: EMAIL_PROVIDER_ERROR, success: null, step: "choose" };
  }
}

export async function confirmClienteRecoveryEmailAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const email = String(formData.get("email") || "");
  const code = String(formData.get("code") || "");
  const result = await confirmClienteRecoveryCodeByEmail({ email, code });
  if (!result.ok) {
    return { error: result.error, success: null, step: "email-code", email };
  }
  await createClienteSession(result.session);
  redirect("/app-cliente/atualizar-acesso?next=%2Fapp-cliente%2Fagendamentos");
}

export async function startClienteRecoveryIdentityAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const purpose = String(formData.get("purpose") || "recover") === "change-email" ? "change-email" : "recover";
  const result = await startClienteRecoveryByIdentity({
    cpf: String(formData.get("cpf") || ""),
    dataNascimento: String(formData.get("dataNascimento") || ""),
    purpose,
  });
  if (!result.ok) return { error: result.error, success: null, step: "choose" };
  return {
    error: null,
    success: result.message,
    step: purpose === "change-email" ? "change-email" : "identity-email",
    token: result.token,
  };
}

export async function requestClienteRecoveryIdentityEmailAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");
  try {
    const result = await requestClienteRecoveryCodeByIdentity({
      token,
      email,
      ...(await requestMetadata()),
    });
    if (!result.ok) {
      return { error: result.error, success: null, step: "identity-email", token, email };
    }
    return { error: null, success: result.message, step: "identity-code", token, email };
  } catch (error) {
    reportRecoveryError("falha ao enviar código após validar CPF e nascimento", error);
    return { error: EMAIL_PROVIDER_ERROR, success: null, step: "identity-email", token, email };
  }
}

export async function confirmClienteRecoveryIdentityAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");
  const code = String(formData.get("code") || "");
  const result = await confirmClienteRecoveryCodeByIdentity({ token, email, code });
  if (!result.ok) {
    return { error: result.error, success: null, step: "identity-code", token, email };
  }
  await createClienteSession(result.session);
  redirect("/app-cliente/agendamentos");
}

export async function requestClienteChangeEmailAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");
  const confirmEmail = String(formData.get("confirmEmail") || "");
  if (confirmEmail && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    return { error: "A confirmação do e-mail não confere.", success: null, step: "change-email", token };
  }
  try {
    const result = await requestClienteEmailChangeCode({
      token,
      newEmail: email,
      ...(await requestMetadata()),
    });
    if (!result.ok) return { error: result.error, success: null, step: "change-email", token, email };
    return { error: null, success: result.message, step: "change-email-code", token, email };
  } catch (error) {
    reportRecoveryError("falha ao enviar código para o novo e-mail", error);
    return { error: EMAIL_PROVIDER_ERROR, success: null, step: "change-email", token, email };
  }
}

export async function confirmClienteChangeEmailAction(
  _prev: RecoverClienteAccessState,
  formData: FormData
): Promise<RecoverClienteAccessState> {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");
  const code = String(formData.get("code") || "");
  const result = await confirmClienteEmailChange({ token, newEmail: email, code });
  if (!result.ok) {
    return { error: result.error, success: null, step: "change-email-code", token, email };
  }
  await createClienteSession(result.session);
  redirect("/app-cliente/perfil?status=email_alterado");
}
