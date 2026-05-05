import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getUserPermissionsRow } from "@/lib/auth/get-user-permissions.server";
import {
  AuthzError,
  requireSalaoMembership,
} from "@/lib/auth/require-salao-membership";
import type { PermissionKey } from "@/lib/permissions";
import {
  getPlanoAccessSnapshot,
  type PlanoRecursoCodigo,
} from "@/lib/plans/access";

type RequireSalaoPermissionOptions = {
  allowedNiveis?: string[];
};

export { AuthzError };

const PERMISSION_FEATURE_MAP: Partial<Record<PermissionKey, PlanoRecursoCodigo>> = {
  agenda_ver: "agenda",
  clientes_ver: "clientes",
  profissionais_ver: "profissionais",
  servicos_ver: "servicos",
  produtos_ver: "produtos",
  estoque_ver: "estoque",
  comandas_ver: "comandas",
  vendas_ver: "vendas",
  caixa_ver: "caixa",
  caixa_editar: "caixa",
  caixa_operar: "caixa",
  caixa_finalizar: "caixa",
  caixa_pagamentos: "caixa",
  comissoes_ver: "comissoes_basicas",
  relatorios_ver: "relatorios_basicos",
  marketing_ver: "marketing",
};

async function validarPlanoParaPermissao(
  idSalao: string,
  permission: PermissionKey
) {
  if (permission === "assinatura_ver") return;

  const access = await getPlanoAccessSnapshot(idSalao);

  if (access.bloqueioTotal) {
    throw new AuthzError(
      access.bloqueioMotivo ||
        "Assinatura bloqueada. Regularize para continuar.",
      402,
      "assinatura_bloqueada"
    );
  }

  const recurso = PERMISSION_FEATURE_MAP[permission];

  if (recurso && access.recursos[recurso] === false) {
    throw new AuthzError(
      `Recurso indisponivel no plano atual: ${recurso}.`,
      402,
      "recurso_indisponivel_plano"
    );
  }
}

export async function requireSalaoPermission(
  idSalao: string,
  permission: PermissionKey,
  options: RequireSalaoPermissionOptions = {}
) {
  const membership = await requireSalaoMembership(idSalao, options);
  const permissoesDb = await getUserPermissionsRow(idSalao, membership.usuario.id);

  const permissoes = {
    ...buildPermissoesByNivel(membership.usuario.nivel),
    ...sanitizePermissoesDb(permissoesDb, {
      idSalao,
      idUsuario: membership.usuario.id,
      origem: "requireSalaoPermission",
    }),
  };

  if (!permissoes[permission]) {
    throw new AuthzError(
      "Usuario sem permissao para esta acao.",
      403,
      "sem_permissao"
    );
  }

  await validarPlanoParaPermissao(idSalao, permission);

  return {
    ...membership,
    permissoes,
  };
}

export async function requireSalaoAnyPermission(
  idSalao: string,
  permissions: PermissionKey[],
  options: RequireSalaoPermissionOptions = {}
) {
  if (permissions.length === 0) {
    throw new AuthzError("Nenhuma permissao informada para validacao.", 500, "permissoes_vazias");
  }

  const membership = await requireSalaoMembership(idSalao, options);
  const permissoesDb = await getUserPermissionsRow(idSalao, membership.usuario.id);

  const permissoes = {
    ...buildPermissoesByNivel(membership.usuario.nivel),
    ...sanitizePermissoesDb(permissoesDb, {
      idSalao,
      idUsuario: membership.usuario.id,
      origem: "requireSalaoAnyPermission",
    }),
  };

  const permitido = permissions.some((permission) => permissoes[permission]);

  if (!permitido) {
    throw new AuthzError(
      "Usuario sem permissao para esta acao.",
      403,
      "sem_permissao"
    );
  }

  for (const permission of permissions) {
    if (permissoes[permission]) {
      await validarPlanoParaPermissao(idSalao, permission);
      break;
    }
  }

  return {
    ...membership,
    permissoes,
  };
}
