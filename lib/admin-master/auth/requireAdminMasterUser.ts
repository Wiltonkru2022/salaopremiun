import { redirect } from "next/navigation";
import {
  mergeAdminMasterPermissions,
  type AdminMasterPermissionKey,
} from "@/lib/admin-master/auth/adminMasterPermissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export class AdminMasterAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AdminMasterAuthError";
    this.status = status;
  }
}

type AdminMasterUsuarioRow = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
};

function getOwnerEmails() {
  return String(process.env.ADMIN_MASTER_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function bootstrapOwnerIfAllowed(params: {
  authUserId: string;
  email: string;
  nome: string;
}) {
  const ownerEmails = getOwnerEmails();
  if (!ownerEmails.includes(params.email.toLowerCase())) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("admin_master_usuarios")
    .upsert(
      {
        auth_user_id: params.authUserId,
        email: params.email.toLowerCase(),
        nome: params.nome,
        perfil: "owner",
        status: "ativo",
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "email" }
    )
    .select("id, nome, email, perfil, status")
    .single();

  if (error) {
    throw new AdminMasterAuthError("Erro ao criar owner AdminMaster.", 500);
  }

  const usuario = data as AdminMasterUsuarioRow;

  await supabaseAdmin.from("admin_master_permissoes").upsert(
    {
      id_admin_master_usuario: usuario.id,
      dashboard_ver: true,
      saloes_ver: true,
      saloes_editar: true,
      saloes_entrar_como: true,
      assinaturas_ver: true,
      assinaturas_ajustar: true,
      cobrancas_ver: true,
      cobrancas_reprocessar: true,
      financeiro_ver: true,
      operacao_ver: true,
      operacao_reprocessar: true,
      suporte_ver: true,
      tickets_ver: true,
      tickets_editar: true,
      produto_ver: true,
      planos_editar: true,
      recursos_editar: true,
      feature_flags_editar: true,
      comunicacao_ver: true,
      notificacoes_editar: true,
      campanhas_editar: true,
      whatsapp_ver: true,
      whatsapp_editar: true,
      relatorios_ver: true,
      usuarios_admin_ver: true,
      usuarios_admin_editar: true,
      auditoria_ver: true,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "id_admin_master_usuario" }
  );

  return usuario;
}

export async function requireAdminMasterUser(
  permission: AdminMasterPermissionKey = "dashboard_ver"
) {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const email = String(user.email || "").toLowerCase();
  const nome =
    String(user.user_metadata?.nome || "").trim() ||
    email.split("@")[0] ||
    "Admin Master";

  const adminUserResult = await supabaseAdmin
    .from("admin_master_usuarios")
    .select("id, nome, email, perfil, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  let adminUser = adminUserResult.data;
  const error = adminUserResult.error;

  if (!adminUser && email) {
    const { data: adminByEmail, error: emailError } = await supabaseAdmin
      .from("admin_master_usuarios")
      .select("id, nome, email, perfil, status")
      .eq("email", email)
      .maybeSingle();

    if (emailError) {
      throw new AdminMasterAuthError("Erro ao validar AdminMaster.", 500);
    }

    if (adminByEmail?.id) {
      adminUser = adminByEmail;
      await supabaseAdmin
        .from("admin_master_usuarios")
        .update({ auth_user_id: user.id, ultimo_acesso_em: new Date().toISOString() })
        .eq("id", adminByEmail.id);
    }
  }

  if (error) {
    throw new AdminMasterAuthError("Erro ao carregar usuario AdminMaster.", 500);
  }

  if (!adminUser && email) {
    adminUser = await bootstrapOwnerIfAllowed({
      authUserId: user.id,
      email,
      nome,
    });
  }

  if (!adminUser) {
    throw new AdminMasterAuthError(
      "Usuario sem acesso ao AdminMaster. Cadastre este e-mail em admin_master_usuarios.",
      403
    );
  }

  const usuario = adminUser as AdminMasterUsuarioRow;

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new AdminMasterAuthError("Usuario AdminMaster inativo.", 403);
  }

  const { data: permissoesDb, error: permissoesError } = await supabaseAdmin
    .from("admin_master_permissoes")
    .select("*")
    .eq("id_admin_master_usuario", usuario.id)
    .maybeSingle();

  if (permissoesError) {
    throw new AdminMasterAuthError(
      "Erro ao carregar permissoes AdminMaster.",
      500
    );
  }

  const permissions = mergeAdminMasterPermissions(
    usuario.perfil,
    permissoesDb as Record<string, unknown> | null
  );

  if (!permissions[permission]) {
    throw new AdminMasterAuthError(
      "Usuario sem permissao para esta area do AdminMaster.",
      403
    );
  }

  await supabaseAdmin
    .from("admin_master_usuarios")
    .update({ ultimo_acesso_em: new Date().toISOString() })
    .eq("id", usuario.id);

  return {
    authUser: user,
    usuario,
    permissions,
  };
}
