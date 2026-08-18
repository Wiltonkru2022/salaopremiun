"use server";

import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import {
  createClienteMigrationLink,
  sendClienteMigrationEmail,
} from "@/app/services/cliente-app/migration-links";

export type MigrationContactState = {
  error: string | null;
  success: string | null;
  link?: string | null;
  whatsappUrl?: string | null;
  message?: string | null;
};

async function requireCampaignContext() {
  const { usuario } = await getPainelUserContext();
  if (!usuario?.id || !usuario.id_salao) throw new Error("Não autorizado.");
  const nivel = String(usuario.nivel || "").toLowerCase();
  if (!new Set(["admin", "gerente"]).has(nivel)) throw new Error("Sem permissão para gerar links de migração.");
  return usuario;
}

export async function generateClienteMigrationLinkAction(
  _prev: MigrationContactState,
  formData: FormData
): Promise<MigrationContactState> {
  try {
    const usuario = await requireCampaignContext();
    const result = await createClienteMigrationLink({
      idSalao: usuario.id_salao,
      idCliente: String(formData.get("idCliente") || ""),
      criadoPorUsuario: usuario.id,
    });
    if (!result.ok) return { error: result.error, success: null };
    return {
      error: null,
      success: "Link seguro gerado. Abra o WhatsApp e envie manualmente.",
      link: result.link,
      whatsappUrl: result.whatsappUrl,
      message: result.message,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível gerar o link.", success: null };
  }
}

export async function sendClienteMigrationEmailAction(
  _prev: MigrationContactState,
  formData: FormData
): Promise<MigrationContactState> {
  try {
    const usuario = await requireCampaignContext();
    const result = await sendClienteMigrationEmail({
      idSalao: usuario.id_salao,
      idCliente: String(formData.get("idCliente") || ""),
      criadoPorUsuario: usuario.id,
    });
    if (!result.ok) return { error: result.error, success: null };
    return { error: null, success: result.message, link: result.link };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível enviar o e-mail.", success: null };
  }
}
