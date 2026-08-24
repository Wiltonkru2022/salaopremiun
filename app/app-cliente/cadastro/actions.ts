"use server";

import { redirect } from "next/navigation";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { createClienteAppAccount } from "@/app/services/cliente-app/auth";
import { detectExistingSalonClientForSignup } from "@/app/services/cliente-app/signup-existing-profile";
import { safeAppClienteNext } from "@/lib/client-app/safe-next";
import { normalizeCpf, normalizeWhatsapp } from "@/lib/client-app/identity";

export type CadastroClienteState = {
  error: string | null;
  existingProfileFound?: boolean;
  existingProfileIdentity?: string | null;
};

export async function cadastroClienteAction(
  _prevState: CadastroClienteState,
  formData: FormData
): Promise<CadastroClienteState> {
  const nome = String(formData.get("nome") || "");
  const dataNascimento = String(formData.get("dataNascimento") || "");
  const cpf = String(formData.get("cpf") || "");
  const whatsapp = String(formData.get("whatsapp") || "");
  const email = String(formData.get("email") || "");
  const next = safeAppClienteNext(formData.get("next"));
  const identityKey = `${normalizeCpf(cpf)}:${normalizeWhatsapp(whatsapp)}`;
  const confirmedExistingProfile =
    String(formData.get("confirm_existing_profile") || "") === identityKey;

  if (!confirmedExistingProfile) {
    const existing = await detectExistingSalonClientForSignup({ cpf, whatsapp });
    if (existing.found) {
      return {
        error: null,
        existingProfileFound: true,
        existingProfileIdentity: identityKey,
      };
    }
  }

  const result = await createClienteAppAccount({
    nome,
    dataNascimento,
    cpf,
    whatsapp,
    email,
  });

  if (!result.ok) {
    return {
      error: result.error,
      existingProfileFound: false,
      existingProfileIdentity: null,
    };
  }

  await createClienteSession(result.session);
  redirect(next);
}
