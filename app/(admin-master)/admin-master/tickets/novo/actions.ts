"use server";

import { redirect } from "next/navigation";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { criarTicketSalaoAdminMaster } from "@/lib/admin-master/actions";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function criarTicketInternoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("tickets_editar");
  const idSalao = textValue(formData, "id_salao");
  const assunto = textValue(formData, "assunto");
  const mensagem = textValue(formData, "mensagem");
  const prioridade = textValue(formData, "prioridade") || "media";
  const categoria = textValue(formData, "categoria") || "suporte";

  if (!idSalao) {
    throw new Error("Escolha o salão para abrir o ticket.");
  }

  if (!assunto || !mensagem) {
    throw new Error("Assunto e mensagem são obrigatórios.");
  }

  const ticket = await criarTicketSalaoAdminMaster({
    idSalao,
    idAdmin: access.usuario.id,
    assunto,
    mensagem,
    prioridade,
    categoria,
  });

  redirect(`/admin-master/tickets/${ticket.ticketId}`);
}
