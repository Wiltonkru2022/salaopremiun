"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

type DeletedSalonRow = {
  id: string;
  id_salao_original: string | null;
  nome_salao: string;
  nome_responsavel: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf_cnpj: string | null;
  endereco_completo: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  cep: string | null;
  data_exclusao: string;
  motivo: string | null;
  origem: string | null;
  metadata: Json | null;
};

const DELETED_SALON_COLUMNS =
  "id, id_salao_original, nome_salao, nome_responsavel, email, telefone, whatsapp, cpf_cnpj, endereco_completo, cidade, estado, bairro, cep, data_exclusao, motivo, origem, metadata";

function metadataObject(value: Json | null | undefined): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Json>;
}

function stringFromMetadata(metadata: Record<string, Json>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function carregarSalaoExcluido(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from("reativar_salao")
    .select(DELETED_SALON_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar o salão excluído.");
  }

  if (!data) {
    throw new Error("Registro de salão excluído não encontrado.");
  }

  return data as DeletedSalonRow;
}

export async function restaurarSalaoExcluidoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("saloes_editar");
  const id = formText(formData, "id");
  const motivo = formText(formData, "motivo");

  if (!id) {
    throw new Error("Informe o registro que será restaurado.");
  }

  const supabase = getSupabaseAdmin();
  const row = await carregarSalaoExcluido(id);
  const metadata = metadataObject(row.metadata);
  const now = new Date().toISOString();

  let idSalaoRestaurado = row.id_salao_original || "";
  let salaExistente = false;

  if (row.id_salao_original) {
    const { data: existente } = await (supabase as any)
      .from("saloes")
      .select("id")
      .eq("id", row.id_salao_original)
      .maybeSingle();

    if (existente?.id) {
      idSalaoRestaurado = existente.id;
      salaExistente = true;
    }
  }

  if (!salaExistente) {
    const insertPayload: Record<string, unknown> = {
      nome: row.nome_salao,
      nome_fantasia: row.nome_salao,
      responsavel: row.nome_responsavel,
      email: row.email,
      telefone: row.telefone,
      whatsapp: row.whatsapp || row.telefone,
      cpf_cnpj: row.cpf_cnpj,
      endereco: row.endereco_completo,
      cidade: row.cidade,
      estado: row.estado,
      bairro: row.bairro,
      cep: row.cep,
      plano: stringFromMetadata(metadata, "plano") || "basico",
      status: "ativo",
      trial_ativo: false,
      created_at: now,
      updated_at: now,
      logo_url: stringFromMetadata(metadata, "logo_url"),
    };

    if (row.id_salao_original) {
      insertPayload.id = row.id_salao_original;
    }

    const { data: restaurado, error: insertError } = await (supabase as any)
      .from("saloes")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !restaurado?.id) {
      throw new Error(
        insertError?.message || "Não foi possível restaurar o salão."
      );
    }

    idSalaoRestaurado = restaurado.id;
  }

  const updatedMetadata = {
    ...metadata,
    admin_master_status: "restaurado",
    restaurado_em: now,
    restaurado_por: access.usuario.id,
    restaurado_id_salao: idSalaoRestaurado,
    restauracao_motivo: motivo || null,
  } satisfies Record<string, Json>;

  const { error: updateError } = await (supabase as any)
    .from("reativar_salao")
    .update({ metadata: updatedMetadata })
    .eq("id", id);

  if (updateError) {
    throw new Error("O salão foi restaurado, mas a auditoria do registro falhou.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "restaurar_salao_excluido",
    entidade: "reativar_salao",
    entidadeId: id,
    descricao: `Salão excluído restaurado: ${row.nome_salao}`,
    payload: {
      id_salao_original: row.id_salao_original,
      id_salao_restaurado: idSalaoRestaurado,
      motivo: motivo || null,
    },
  });

  revalidatePath("/admin-master/saloes-excluidos");
  revalidatePath(`/admin-master/saloes-excluidos/${id}`);
  revalidatePath("/admin-master/saloes");
  redirect(`/admin-master/saloes-excluidos/${id}?ok=restaurado`);
}

export async function manterSalaoExcluidoAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("saloes_editar");
  const id = formText(formData, "id");
  const motivo = formText(formData, "motivo");

  if (!id) {
    throw new Error("Informe o registro que será mantido como excluído.");
  }

  const supabase = getSupabaseAdmin();
  const row = await carregarSalaoExcluido(id);
  const metadata = metadataObject(row.metadata);
  const now = new Date().toISOString();

  const updatedMetadata = {
    ...metadata,
    admin_master_status: "mantido_excluido",
    mantido_excluido_em: now,
    mantido_excluido_por: access.usuario.id,
    mantido_excluido_motivo: motivo || null,
  } satisfies Record<string, Json>;

  const { error } = await (supabase as any)
    .from("reativar_salao")
    .update({ metadata: updatedMetadata })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível registrar a decisão para este salão.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "manter_salao_excluido",
    entidade: "reativar_salao",
    entidadeId: id,
    descricao: `Salão mantido como excluído: ${row.nome_salao}`,
    payload: {
      id_salao_original: row.id_salao_original,
      motivo: motivo || null,
    },
  });

  revalidatePath("/admin-master/saloes-excluidos");
  revalidatePath(`/admin-master/saloes-excluidos/${id}`);
  redirect(`/admin-master/saloes-excluidos/${id}?ok=mantido`);
}
