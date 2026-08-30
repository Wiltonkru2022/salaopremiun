import "server-only";

import { Pool } from "@neondatabase/serverless";
import { mergeAdminMasterPermissions } from "@/lib/admin-master/auth/adminMasterPermissions";
import { resolveNeonRuntimeUrl } from "@/lib/neon/runtime-url.server";

type AdminRow = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  auth_user_id: string | null;
};

type PermissionRow = Record<string, unknown> | null;

export type AdminMasterPasswordAccess = {
  id: string;
  authUserId: string;
  nome: string;
  email: string;
  perfil: string;
};

let pool: Pool | null = null;
let poolUrl = "";

function databaseUrl() {
  const url = resolveNeonRuntimeUrl(
    process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL,
  );
  if (!url) {
    throw new Error(
      "Neon não configurado. Defina NEON_ADMIN_DATABASE_URL ou NEON_DATABASE_URL.",
    );
  }
  return url;
}

function getPool() {
  const url = databaseUrl();
  if (!pool || poolUrl !== url) {
    pool = new Pool({ connectionString: url });
    poolUrl = url;
  }
  return pool;
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Validação dedicada do Admin Master.
 *
 * Esta função NÃO passa pelo adapter Supabase-like de lib/neon/painel-query.server.ts.
 * Todas as variáveis PostgreSQL recebem casts explícitos para impedir 42P18.
 */
export async function resolveAdminMasterPasswordAccess(params: {
  email: string;
  clerkUserId: string;
  externalId?: string | null;
  nome?: string | null;
}): Promise<AdminMasterPasswordAccess> {
  const email = normalizeEmail(params.email);
  if (!email) throw Object.assign(new Error("E-mail administrativo inválido."), { status: 400 });

  const client = await getPool().connect();
  try {
    const adminResult = await client.query<AdminRow>(
      `select
         id::text as id,
         coalesce(nome, '')::text as nome,
         lower(email::text) as email,
         coalesce(perfil, 'analista')::text as perfil,
         coalesce(status, 'inativo')::text as status,
         auth_user_id::text as auth_user_id
       from public.admin_master_usuarios
       where lower(email::text) = lower($1::text)
       limit 1`,
      [email],
    );

    const admin = adminResult.rows[0] || null;
    if (!admin) {
      throw Object.assign(
        new Error("Usuário sem acesso ao Admin Master. Cadastre este e-mail em admin_master_usuarios."),
        { status: 403 },
      );
    }

    if (String(admin.status || "").trim().toLowerCase() !== "ativo") {
      throw Object.assign(new Error("Usuário Admin Master inativo."), { status: 403 });
    }

    const permissionResult = await client.query<Record<string, unknown>>(
      `select *
         from public.admin_master_permissoes
        where id_admin_master_usuario::text = $1::text
        limit 1`,
      [admin.id],
    );

    const dbPermissions = (permissionResult.rows[0] || null) as PermissionRow;
    const permissions = mergeAdminMasterPermissions(admin.perfil, dbPermissions);
    if (!permissions.dashboard_ver) {
      throw Object.assign(
        new Error("Usuário sem permissão para o dashboard do Admin Master."),
        { status: 403 },
      );
    }

    await client.query(
      `update public.admin_master_usuarios
          set ultimo_acesso_em = now()
        where id::text = $1::text`,
      [admin.id],
    );

    const stableAuthId =
      String(admin.auth_user_id || "").trim() ||
      String(params.externalId || "").trim() ||
      String(params.clerkUserId || "").trim();

    return {
      id: admin.id,
      authUserId: stableAuthId,
      nome: String(admin.nome || params.nome || email.split("@")[0] || "Admin Master"),
      email: admin.email || email,
      perfil: admin.perfil || "analista",
    };
  } finally {
    client.release();
  }
}
