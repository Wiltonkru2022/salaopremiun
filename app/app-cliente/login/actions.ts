"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import {
  loginClienteAppByCpfNascimento,
  loginClienteAppByEmailSenha,
} from "@/app/services/cliente-app/auth";
import { assertClienteCpfLoginAllowed } from "@/lib/client-app/login-rate-limit";
import { safeAppClienteNext } from "@/lib/client-app/safe-next";

export type LoginClienteState = {
  error: string | null;
};

async function metadata() {
  const h = await headers();
  const forwarded = String(
    h.get("x-forwarded-for") || ""
  );

  return {
    ip:
      forwarded.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null,
    userAgent:
      h.get("user-agent") || null,
  };
}

/*
 * Mantido apenas para compatibilidade com código antigo.
 * LoginClienteForm.tsx NOVO não usa Server Action.
 */
export async function loginClienteAction(
  _prevState: LoginClienteState,
  formData: FormData
): Promise<LoginClienteState> {
  const cpf = String(
    formData.get("cpf") || ""
  );
  const dataNascimento = String(
    formData.get("dataNascimento") || ""
  );
  const idSalao =
    String(
      formData.get("salao") || ""
    ).trim() || null;
  const next = safeAppClienteNext(
    formData.get("next")
  );
  const requestMeta = await metadata();

  const limit =
    await assertClienteCpfLoginAllowed({
      cpf,
      ip: requestMeta.ip,
    });

  if (!limit.allowed) {
    return {
      error:
        "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.",
    };
  }

  const result =
    await loginClienteAppByCpfNascimento({
      cpf,
      dataNascimento,
      idSalao,
      ...requestMeta,
    });

  if (!result.ok) {
    if (result.redirectTo) {
      redirect(
        safeAppClienteNext(
          result.redirectTo
        )
      );
    }

    return {
      error: result.error,
    };
  }

  await createClienteSession(
    result.session
  );

  redirect(next);
}

export async function loginClienteLegacyAction(
  _prevState: LoginClienteState,
  formData: FormData
): Promise<LoginClienteState> {
  const identidade = String(
    formData.get("identidade") || ""
  );
  const senha = String(
    formData.get("senha") || ""
  );
  const idSalao =
    String(
      formData.get("salao") || ""
    ).trim() || null;
  const next = safeAppClienteNext(
    formData.get("next")
  );

  const result =
    await loginClienteAppByEmailSenha({
      email: identidade,
      senha,
      idSalao,
    });

  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  await createClienteSession(
    result.session
  );

  if (result.migrationRequired) {
    redirect(
      `/app-cliente/atualizar-acesso?next=${encodeURIComponent(
        next
      )}`
    );
  }

  redirect(next);
}
