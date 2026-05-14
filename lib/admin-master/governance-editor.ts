import type { Json } from "@/types/database.generated";
import type { AdminMasterGovernanceEditorData } from "@/components/admin-master/AdminMasterGovernanceEditor";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildAdminMasterPermissionsByPerfil } from "@/lib/admin-master/auth/adminMasterPermissions";
import { PLANO_RECURSOS_PADRAO } from "@/lib/plans/access";

const PERMISSION_KEYS = Object.keys(
  buildAdminMasterPermissionsByPerfil("owner")
) as Array<keyof ReturnType<typeof buildAdminMasterPermissionsByPerfil>>;

function stringifyConfigValue(value: Json | null | undefined) {
  if (value === undefined || value === null) return "{}";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export async function getAdminMasterGovernanceEditorData(): Promise<AdminMasterGovernanceEditorData> {
  const supabase = getSupabaseAdmin();

  const [
    { data: flags },
    { data: releases },
    { data: saloes },
    { data: admins },
    { data: permissoes },
    { data: configs },
    { data: planos },
  ] = await Promise.all([
    supabase
      .from("feature_flags")
      .select(
        "id, nome, descricao, status_global, tipo_liberacao, planos_json, data_inicio, data_fim, criado_em"
      )
      .order("criado_em", { ascending: false })
      .limit(100),
    supabase
      .from("feature_flag_saloes")
      .select("id, id_feature_flag, id_salao, ativo, criado_em")
      .limit(1000),
    supabase
      .from("saloes")
      .select("id, nome, cidade, plano, status")
      .order("nome", { ascending: true })
      .limit(300),
    supabase
      .from("admin_master_usuarios")
      .select("id, auth_user_id, nome, email, perfil, status, ultimo_acesso_em, criado_em, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(100),
    supabase
      .from("admin_master_permissoes")
      .select(
        "id, id_admin_master_usuario, dashboard_ver, saloes_ver, saloes_editar, saloes_entrar_como, financeiro_ver, relatorios_ver, assinaturas_ver, assinaturas_ajustar, cobrancas_ver, cobrancas_reprocessar, planos_editar, recursos_editar, produto_ver, operacao_ver, operacao_reprocessar, tickets_ver, tickets_editar, suporte_ver, notificacoes_editar, campanhas_editar, comunicacao_ver, whatsapp_ver, whatsapp_editar, feature_flags_editar, usuarios_admin_ver, usuarios_admin_editar, auditoria_ver, criado_em, atualizado_em"
      )
      .limit(200),
    supabase
      .from("configuracoes_globais")
      .select("id, chave, descricao, valor_json, atualizado_por, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(120),
    supabase
      .from("planos_saas")
      .select("codigo, nome")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
  ]);

  const releasesByFlag = new Map<
    string,
    Array<{
      id: string;
      idSalao: string;
      ativo: boolean;
      criadoEm: string;
    }>
  >();

  for (const release of (releases || []) as Array<{
    id?: string | null;
    id_feature_flag?: string | null;
    id_salao?: string | null;
    ativo?: boolean | null;
    criado_em?: string | null;
  }>) {
    if (!release.id || !release.id_feature_flag || !release.id_salao) continue;
    const current = releasesByFlag.get(release.id_feature_flag) || [];
    current.push({
      id: release.id,
      idSalao: release.id_salao,
      ativo: release.ativo !== false,
      criadoEm: release.criado_em || "",
    });
    releasesByFlag.set(release.id_feature_flag, current);
  }

  const permissionsByAdmin = new Map(
    ((permissoes || []) as Record<string, unknown>[]).map((row) => [
      String(row.id_admin_master_usuario || ""),
      row,
    ])
  );

  const plans = ((planos || []) as Array<{ codigo?: string | null; nome?: string | null }>).map(
    (plano) => ({
      codigo: plano.codigo || "",
      nome: plano.nome || plano.codigo || "Plano",
    })
  );

  return {
    planos: plans,
    recursosPadrao: PLANO_RECURSOS_PADRAO,
    saloes: ((saloes || []) as Array<{
      id: string;
      nome?: string | null;
      cidade?: string | null;
      plano?: string | null;
      status?: string | null;
    }>).map((salao) => ({
      id: salao.id,
      nome: salao.nome || salao.id,
      cidade: salao.cidade || null,
      plano: salao.plano || null,
      status: salao.status || null,
    })),
    featureFlags: ((flags || []) as Array<{
      id: string;
      nome?: string | null;
      descricao?: string | null;
      status_global?: boolean | null;
      tipo_liberacao?: string | null;
      planos_json?: Json | null;
      data_inicio?: string | null;
      data_fim?: string | null;
      criado_em?: string | null;
    }>).map((flag) => ({
      id: flag.id,
      nome: flag.nome || "Feature flag",
      descricao: flag.descricao || null,
      statusGlobal: flag.status_global === true,
      tipoLiberacao: flag.tipo_liberacao || "plano",
      planos: Array.isArray(flag.planos_json)
        ? flag.planos_json.map(String)
        : [],
      dataInicio: flag.data_inicio || null,
      dataFim: flag.data_fim || null,
      criadoEm: flag.criado_em || "",
      saloes: releasesByFlag.get(flag.id) || [],
    })),
    usuarios: ((admins || []) as Array<{
      id: string;
      auth_user_id?: string | null;
      nome?: string | null;
      email?: string | null;
      perfil?: string | null;
      status?: string | null;
      ultimo_acesso_em?: string | null;
      criado_em?: string | null;
      atualizado_em?: string | null;
    }>).map((admin) => {
      const defaultPermissions = buildAdminMasterPermissionsByPerfil(admin.perfil);
      const dbPermissions = permissionsByAdmin.get(admin.id) || {};

      return {
        id: admin.id,
        authUserId: admin.auth_user_id || null,
        nome: admin.nome || "Admin Master",
        email: admin.email || "",
        perfil: admin.perfil || "analista",
        status: admin.status || "ativo",
        ultimoAcessoEm: admin.ultimo_acesso_em || null,
        criadoEm: admin.criado_em || "",
        atualizadoEm: admin.atualizado_em || "",
        permissoes: PERMISSION_KEYS.reduce<Record<string, boolean>>((acc, key) => {
          acc[key] =
            typeof dbPermissions[key] === "boolean"
              ? Boolean(dbPermissions[key])
              : Boolean(defaultPermissions[key]);
          return acc;
        }, {}),
      };
    }),
    permissionKeys: PERMISSION_KEYS,
    configuracoes: ((configs || []) as Array<{
      id: string;
      chave?: string | null;
      descricao?: string | null;
      valor_json?: Json | null;
      atualizado_por?: string | null;
      atualizado_em?: string | null;
    }>).map((config) => ({
      id: config.id,
      chave: config.chave || "",
      descricao: config.descricao || null,
      valorJsonText: stringifyConfigValue(config.valor_json),
      atualizadoPor: config.atualizado_por || null,
      atualizadoEm: config.atualizado_em || "",
    })),
  };
}
