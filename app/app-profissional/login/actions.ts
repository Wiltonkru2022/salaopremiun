"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearProfissionalLoginFailures,
  assertProfissionalLoginAllowed,
  registerProfissionalLoginFailure,
} from "@/lib/security/profissional-login-rate-limit";
import { createProfissionalSession } from "@/lib/profissional-auth.server";
import { loginProfissionalByCpfSenha } from "@/app/services/profissional/auth";

export type LoginProfissionalState = {
  error: string | null;
};

function normalizeCpf(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

async function buildRateLimitKey(cpf: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "sem-ip";
  const userAgent = headerStore.get("user-agent") || "sem-user-agent";
  return `${normalizeCpf(cpf)}|${ip}|${userAgent.slice(0, 80)}`;
}

export async function loginProfissionalAction(
  _prevState: LoginProfissionalState,
  formData: FormData
): Promise<LoginProfissionalState> {
  const cpf = String(formData.get("cpf") || "");
  const senha = String(formData.get("senha") || "").trim();
  const rateLimitKey = await buildRateLimitKey(cpf);

  try {
    await assertProfissionalLoginAllowed(rateLimitKey);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel validar o limite de tentativas.",
    };
  }

  const result = await loginProfissionalByCpfSenha(cpf, senha);

  if (!result.ok) {
    await registerProfissionalLoginFailure(rateLimitKey);
    return { error: result.error };
  }

  await clearProfissionalLoginFailures(rateLimitKey);
  await createProfissionalSession(result.session);
  redirect("/app-profissional/inicio");
}
