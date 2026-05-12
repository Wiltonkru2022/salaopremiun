"use server";

import { revalidatePath } from "next/cache";
import {
  buildAdminMasterPermissionsByPerfil,
  type AdminMasterPermissionKey,
} from "@/lib/admin-master/auth/adminMasterPermissions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.generated";

type AdminMasterPermissaoInsert =
  Database["public"]["Tables"]["admin_master_permissoes"]["Insert"];

const PERMISSION_KEYS = Object.keys(
  buildAdminMasterPermissionsByPerfil("owner")
) as AdminMasterPermissionKey[];

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function salvarUsuarioAdminMaster(formData: FormData) {
  const access = await requireAdminMasterUser("usuarios_admin_editar");
  const supabase = getSupabaseAdmin();
  const id = textValue(formData, "id");
  const nome = textValue(formData, "nome");
  const email = normalizeEmail(textValue(formData, "email"));
  const perfil = textValue(formData, "perfil") || "analista";
  const status = textValue(formData, "status") || "ativo";

  if (!nome || !email) {
    throw new Error("Nome e e-mail são obrigatórios.");
  }

  const userPayload = {
    nome,
    email,
    perfil,
    status,
    atualizado_em: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("admin_master_usuarios").update(userPayload).eq("id", id).select("id").single()
    : supabase.from("admin_master_usuarios").insert(userPayload).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível salvar o usuário AdminMaster.");
  }

  const adminId = String(data.id);
  const selected = new Set(
    formData
      .getAll("permissoes")
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  const permissionPayload = PERMISSION_KEYS.reduce<AdminMasterPermissaoInsert>(
    (acc, key) => {
      acc[key] = selected.has(key);
      return acc;
    },
    {
      id_admin_master_usuario: adminId,
      atualizado_em: new Date().toISOString(),
    }
  );

  const { error: permissionError } = await supabase
    .from("admin_master_permissoes")
    .upsert(permissionPayload, { onConflict: "id_admin_master_usuario" });

  if (permissionError) {
    throw new Error(permissionError.message || "Usuário salvo, mas as permissões falharam.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: id ? "editar_usuario_admin" : "criar_usuario_admin",
    entidade: "admin_master_usuarios",
    entidadeId: adminId,
    descricao: `Usuário AdminMaster ${email} atualizado.`,
    payload: {
      nome,
      email,
      perfil,
      status,
      permissoes: Array.from(selected),
    },
  });

  revalidatePath("/admin-master/usuarios-admin");
  revalidatePath("/admin-master/logs");
}
