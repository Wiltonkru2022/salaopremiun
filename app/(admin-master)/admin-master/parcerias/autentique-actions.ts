"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { consultarDocumentoAutentique, criarDocumentoAutentique } from "@/lib/parcerias/autentique";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function enviarContratoAutentique(formData: FormData) {
  const access = await requireAdminMasterUser("campanhas_editar");
  const supabase = getSupabaseAdmin() as any;
  const idContrato = text(formData, "id_contrato");
  if (!idContrato) throw new Error("Contrato não informado.");

  const { data: contrato, error } = await supabase
    .from("parceria_contratos")
    .select("id,numero,status,conteudo_snapshot,signatario_email,envelope_externo_id")
    .eq("id", idContrato)
    .single();

  if (error || !contrato) throw new Error(error?.message || "Contrato não encontrado.");
  if (contrato.envelope_externo_id) {
    throw new Error("Este contrato já foi enviado ao provedor de assinatura.");
  }
  if (!contrato.signatario_email) {
    throw new Error("Cadastre o e-mail do parceiro antes de enviar para assinatura.");
  }

  const envio = await criarDocumentoAutentique({
    nome: `Contrato ${contrato.numero} - Salão Premium`,
    conteudo: contrato.conteudo_snapshot,
    signatarioEmail: contrato.signatario_email,
  });

  const { error: updateError } = await supabase
    .from("parceria_contratos")
    .update({
      status: "enviado_assinatura",
      provedor_assinatura: "autentique",
      envelope_externo_id: envio.documentId,
      url_assinatura: envio.signatureUrl,
      evidencia_assinatura: {
        signature_public_id: envio.signaturePublicId,
        envio: "api",
        enviado_em: new Date().toISOString(),
      },
    })
    .eq("id", idContrato);

  if (updateError) throw new Error(updateError.message || "Documento enviado, mas não foi possível atualizar o contrato.");

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "enviar_contrato_autentique",
    entidade: "parceria_contratos",
    entidadeId: idContrato,
    descricao: `Contrato ${contrato.numero} enviado para assinatura eletrônica pelo Autentique.`,
    payload: { provedor: "autentique", documento_id: envio.documentId },
  });

  revalidatePath("/admin-master/parcerias");
}

export async function sincronizarContratoAutentique(formData: FormData) {
  const access = await requireAdminMasterUser("campanhas_editar");
  const supabase = getSupabaseAdmin() as any;
  const idContrato = text(formData, "id_contrato");
  if (!idContrato) throw new Error("Contrato não informado.");

  const { data: contrato, error } = await supabase
    .from("parceria_contratos")
    .select("id,numero,provedor_assinatura,envelope_externo_id,evidencia_assinatura")
    .eq("id", idContrato)
    .single();

  if (error || !contrato) throw new Error(error?.message || "Contrato não encontrado.");
  if (contrato.provedor_assinatura !== "autentique" || !contrato.envelope_externo_id) {
    throw new Error("Contrato ainda não foi enviado pelo Autentique.");
  }

  const remoto = await consultarDocumentoAutentique(contrato.envelope_externo_id);
  const status = remoto.signedAt ? "assinado" : remoto.rejectedAt ? "recusado" : "enviado_assinatura";

  const { error: updateError } = await supabase
    .from("parceria_contratos")
    .update({
      status,
      url_assinatura: remoto.signatureUrl || undefined,
      assinado_em: remoto.signedAt,
      evidencia_assinatura: {
        ...(contrato.evidencia_assinatura || {}),
        viewed_at: remoto.viewedAt,
        rejected_at: remoto.rejectedAt,
        signed_at: remoto.signedAt,
        signed_file_url: remoto.signedFileUrl,
        ultima_sincronizacao: new Date().toISOString(),
      },
    })
    .eq("id", idContrato);

  if (updateError) throw new Error(updateError.message || "Não foi possível atualizar o status do contrato.");

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "sincronizar_contrato_autentique",
    entidade: "parceria_contratos",
    entidadeId: idContrato,
    descricao: `Contrato ${contrato.numero} sincronizado com o Autentique: ${status}.`,
    payload: { status, assinado_em: remoto.signedAt, recusado_em: remoto.rejectedAt },
  });

  revalidatePath("/admin-master/parcerias");
}
