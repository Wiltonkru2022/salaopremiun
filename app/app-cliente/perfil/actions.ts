"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClienteSession } from "@/lib/cliente-auth.server";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { normalizeCpf, parseClienteBirthDate } from "@/lib/client-app/identity";
import { completeClienteIdentityMigration } from "@/app/services/cliente-app/identity-migration";
import {
  deleteClienteAppAccount,
  updateClienteAppProfile,
} from "@/app/services/cliente-app/profile";

export type ClienteProfileState = {
  error: string | null;
};

export async function updateClienteProfileAction(
  _prevState: ClienteProfileState,
  formData: FormData
): Promise<ClienteProfileState> {
  const session = await requireClienteAppContext();
  const nome = String(formData.get("nome") || "");
  const email = String(formData.get("email") || "");
  const telefone = String(formData.get("telefone") || "");
  const cpf = String(formData.get("cpf") || "");
  const dataNascimento = String(formData.get("dataNascimento") || "");
  const preferencias = String(formData.get("preferencias") || "");

  const normalizedCpf = normalizeCpf(cpf);
  const normalizedBirth = parseClienteBirthDate(dataNascimento);
  const currentCpf = normalizeCpf(session.cpf);
  const currentBirth = parseClienteBirthDate(session.dataNascimento);
  const identityChanged =
    !session.migracaoIdentidadeConcluida ||
    normalizedCpf !== currentCpf ||
    normalizedBirth !== currentBirth;

  if (identityChanged) {
    const migrationResult = await completeClienteIdentityMigration({
      idConta: session.idConta,
      cpf,
      dataNascimento,
      whatsapp: telefone,
    });

    if (!migrationResult.ok) {
      return { error: migrationResult.error };
    }

    await createClienteSession(migrationResult.session);
  }

  const result = await updateClienteAppProfile({
    idConta: session.idConta,
    nome,
    email,
    telefone,
    preferencias,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/app-cliente/perfil");
  revalidatePath("/app-cliente/perfil/editar");
  redirect("/app-cliente/perfil?status=salvo");
}

export async function deleteClienteProfileAction() {
  const session = await requireClienteAppContext();

  const result = await deleteClienteAppAccount({
    idConta: session.idConta,
  });

  if (!result.ok) {
    redirect("/app-cliente/perfil?status=erro_excluir");
  }

  redirect("/app-cliente/login?status=conta_excluida");
}
