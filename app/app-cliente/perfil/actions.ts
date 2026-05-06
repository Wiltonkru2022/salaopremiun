"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
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
  const preferencias = String(formData.get("preferencias") || "");

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
