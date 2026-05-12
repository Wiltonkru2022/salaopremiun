"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberValue(formData: FormData, key: string) {
  const raw = textValue(formData, key).replace(/[^\d,.-]/g, "").replace(",", ".");
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

export async function salvarWhatsappPacoteAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("whatsapp_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const payload = {
    nome: textValue(formData, "nome"),
    preco: numberValue(formData, "preco"),
    quantidade_creditos: Math.max(0, Math.floor(numberValue(formData, "quantidade_creditos"))),
    ativo: formData.get("ativo") === "on",
  };

  if (!payload.nome) throw new Error("Informe o nome do pacote.");

  if (id) {
    const { error } = await supabase.from("whatsapp_pacotes").update(payload).eq("id", id);
    if (error) throw new Error(error.message || "Nao foi possivel salvar o pacote.");
  } else {
    const { error } = await supabase.from("whatsapp_pacotes").insert(payload);
    if (error) throw new Error(error.message || "Nao foi possivel criar o pacote.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_whatsapp_pacote" : "criar_whatsapp_pacote",
    entidade: "whatsapp_pacotes",
    entidadeId: id || null,
    descricao: `Pacote WhatsApp ${payload.nome} salvo pelo AdminMaster.`,
    payload,
  });

  revalidatePath("/admin-master/whatsapp");
  revalidatePath("/admin-master/whatsapp/pacotes");
}

export async function salvarWhatsappTemplateAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("whatsapp_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const payload = {
    nome: textValue(formData, "nome"),
    categoria: textValue(formData, "categoria") || "marketing",
    conteudo: textValue(formData, "conteudo"),
    ativo: formData.get("ativo") === "on",
  };

  if (!payload.nome || !payload.conteudo) {
    throw new Error("Informe nome e conteudo do template.");
  }

  if (id) {
    const { error } = await supabase.from("whatsapp_templates").update(payload).eq("id", id);
    if (error) throw new Error(error.message || "Nao foi possivel salvar o template.");
  } else {
    const { error } = await supabase.from("whatsapp_templates").insert(payload);
    if (error) throw new Error(error.message || "Nao foi possivel criar o template.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_whatsapp_template" : "criar_whatsapp_template",
    entidade: "whatsapp_templates",
    entidadeId: id || null,
    descricao: `Template WhatsApp ${payload.nome} salvo pelo AdminMaster.`,
    payload: { ...payload, conteudo_preview: payload.conteudo.slice(0, 120) },
  });

  revalidatePath("/admin-master/whatsapp");
  revalidatePath("/admin-master/whatsapp/templates");
}
