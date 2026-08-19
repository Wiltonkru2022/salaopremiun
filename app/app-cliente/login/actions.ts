"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import {
  loginClienteAppByCpfNascimento,
  loginClienteAppByEmailSenha,
} from "@/app/services/cliente-app/auth";
import { assertClienteCpfLoginAllowed } from "@/lib/client-app/login-rate-limit";
import { normalizeSafeInternalPath } from "@/lib/security/safe-next-path";

export type LoginClienteState = { error: string | null };

async function getRequestMetadata() {
  const h = await headers();
  const forwarded = String(h.get("x-forwarded-for") || "");
  return {
    ip: forwarded.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent") || null,
  };
}

export async function loginClienteAction(
  _prevState: LoginClienteState,
  formData: FormData
): Promise<LoginClienteState> {
  const cpf = String(formData.get("cpf") || "");
  const dataNascimento = String(formData.get("dataNascimento") || "");
  const idSalao = String(formData.get("salao") || "").trim() || null;
  const next = normalizeSafeInternalPath(
    formData.get("next"),
    "/app-cliente",
    "/app-cliente/inicio"
  );
  const metadata = await getRequestMetadata();

  try {
    const limit = await assertClienteCpfLoginAllowed({ cpf, ip: metadata.ip });
    if (!limit.allowed) {
      return { error: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." };
    }
  } catch {
    return { error: "Não foi possível validar o acesso agora. Tente novamente." };
  }

  const result = await loginClienteAppByCpfNascimento({
    cpf,
    dataNascimento,
    idSalao,
    ...metadata,
  });

  if (!result.ok) {
    if (result.redirectTo) redirect(result.redirectTo);
    return { error: result.error };
  }

  await createClienteSession(result.session);
  redirect(next);
}

export async function loginClienteLegacyAction(
  _prevState: LoginClienteState,
  formData: FormData
): Promise<LoginClienteState> {
  const identidade = String(formData.get("identidade") || "");
  const senha = String(formData.get("senha") || "");
  const idSalao = String(formData.get("salao") || "").trim() || null;
  const next = normalizeSafeInternalPath(
    formData.get("next"),
    "/app-cliente",
    "/app-cliente/inicio"
  );

  const result = await loginClienteAppByEmailSenha({ email: identidade, senha, idSalao });
  if (!result.ok) {
    if (result.redirectTo) redirect(result.redirectTo);
    return { error: result.error };
  }

  await createClienteSession(result.session);
  if (result.migrationRequired) {
    redirect(`/app-cliente/atualizar-acesso?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}
