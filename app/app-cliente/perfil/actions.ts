"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { updateClienteAppProfile } from "@/app/services/cliente-app/profile";

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
    idSalao: session.idSalao,
    idCliente: session.idCliente,
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
