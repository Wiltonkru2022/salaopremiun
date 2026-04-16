export type AdminMasterPerfil =
  | "owner"
  | "financeiro"
  | "suporte"
  | "operacao"
  | "produto"
  | "marketing"
  | "analista";

export type AdminMasterPermissionKey =
  | "dashboard_ver"
  | "saloes_ver"
  | "saloes_editar"
  | "saloes_entrar_como"
  | "assinaturas_ver"
  | "assinaturas_ajustar"
  | "cobrancas_ver"
  | "cobrancas_reprocessar"
  | "financeiro_ver"
  | "operacao_ver"
  | "operacao_reprocessar"
  | "suporte_ver"
  | "tickets_ver"
  | "tickets_editar"
  | "produto_ver"
  | "planos_editar"
  | "recursos_editar"
  | "feature_flags_editar"
  | "comunicacao_ver"
  | "notificacoes_editar"
  | "campanhas_editar"
  | "whatsapp_ver"
  | "whatsapp_editar"
  | "relatorios_ver"
  | "usuarios_admin_ver"
  | "usuarios_admin_editar"
  | "auditoria_ver";

export type AdminMasterPermissions = Record<AdminMasterPermissionKey, boolean>;

const ALL_PERMISSIONS: AdminMasterPermissionKey[] = [
  "dashboard_ver",
  "saloes_ver",
  "saloes_editar",
  "saloes_entrar_como",
  "assinaturas_ver",
  "assinaturas_ajustar",
  "cobrancas_ver",
  "cobrancas_reprocessar",
  "financeiro_ver",
  "operacao_ver",
  "operacao_reprocessar",
  "suporte_ver",
  "tickets_ver",
  "tickets_editar",
  "produto_ver",
  "planos_editar",
  "recursos_editar",
  "feature_flags_editar",
  "comunicacao_ver",
  "notificacoes_editar",
  "campanhas_editar",
  "whatsapp_ver",
  "whatsapp_editar",
  "relatorios_ver",
  "usuarios_admin_ver",
  "usuarios_admin_editar",
  "auditoria_ver",
];

function basePermissions(): AdminMasterPermissions {
  return ALL_PERMISSIONS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as AdminMasterPermissions);
}

function allow(keys: AdminMasterPermissionKey[]) {
  const permissions = basePermissions();
  keys.forEach((key) => {
    permissions[key] = true;
  });
  return permissions;
}

export function buildAdminMasterPermissionsByPerfil(
  perfil?: string | null
): AdminMasterPermissions {
  const normalized = String(perfil || "analista").toLowerCase();

  if (normalized === "owner") {
    return allow(ALL_PERMISSIONS);
  }

  if (normalized === "financeiro") {
    return allow([
      "dashboard_ver",
      "saloes_ver",
      "assinaturas_ver",
      "assinaturas_ajustar",
      "cobrancas_ver",
      "cobrancas_reprocessar",
      "financeiro_ver",
      "relatorios_ver",
      "auditoria_ver",
    ]);
  }

  if (normalized === "suporte") {
    return allow([
      "dashboard_ver",
      "saloes_ver",
      "saloes_entrar_como",
      "suporte_ver",
      "tickets_ver",
      "tickets_editar",
      "operacao_ver",
      "usuarios_admin_ver",
      "auditoria_ver",
    ]);
  }

  if (normalized === "operacao") {
    return allow([
      "dashboard_ver",
      "saloes_ver",
      "operacao_ver",
      "operacao_reprocessar",
      "cobrancas_reprocessar",
      "auditoria_ver",
    ]);
  }

  if (normalized === "produto") {
    return allow([
      "dashboard_ver",
      "produto_ver",
      "planos_editar",
      "recursos_editar",
      "feature_flags_editar",
      "relatorios_ver",
      "auditoria_ver",
    ]);
  }

  if (normalized === "marketing") {
    return allow([
      "dashboard_ver",
      "comunicacao_ver",
      "notificacoes_editar",
      "campanhas_editar",
      "whatsapp_ver",
      "whatsapp_editar",
      "relatorios_ver",
    ]);
  }

  return allow(["dashboard_ver", "saloes_ver", "relatorios_ver"]);
}

export function mergeAdminMasterPermissions(
  perfil: string | null | undefined,
  dbPermissions: Record<string, unknown> | null
) {
  const defaults = buildAdminMasterPermissionsByPerfil(perfil);

  if (!dbPermissions) {
    return defaults;
  }

  const merged = { ...defaults };
  ALL_PERMISSIONS.forEach((key) => {
    if (typeof dbPermissions[key] === "boolean") {
      merged[key] = Boolean(dbPermissions[key]);
    }
  });

  return merged;
}

export function canAdminMaster(
  permissions: AdminMasterPermissions,
  permission: AdminMasterPermissionKey
) {
  return Boolean(permissions[permission]);
}
