// lib/auth/permissions.ts
import {
  PERMISSIONS,
  type PermissionKey,
  type UserNivel,
} from "@/lib/permissions";

export type Permissoes = Record<string, boolean>;

const LEGACY_PERMISSION_ALIASES: Record<string, PermissionKey[]> = {
  caixa_fechar: ["caixa_finalizar"],
  comissoes_pagar: ["comissoes_editar", "comissoes_financeiro"],
  estoque_movimentar: ["estoque_operar"],
};

function normalizeNivel(value: string | null | undefined): UserNivel | null {
  const nivel = String(value || "").trim().toLowerCase();

  if (
    nivel === "admin" ||
    nivel === "gerente" ||
    nivel === "profissional" ||
    nivel === "recepcao"
  ) {
    return nivel;
  }

  return null;
}

export function hasPermission(
  nivel: UserNivel | null | undefined,
  permission: PermissionKey
) {
  if (!nivel) return false;
  return PERMISSIONS[permission].includes(nivel);
}

export function buildPermissoesByNivel(
  nivel: string | null | undefined
): Permissoes {
  const nivelNormalizado = normalizeNivel(nivel);
  const resultado: Permissoes = {};

  (Object.keys(PERMISSIONS) as PermissionKey[]).forEach((key) => {
    resultado[key] =
      !!nivelNormalizado && PERMISSIONS[key].includes(nivelNormalizado);
  });

  return resultado;
}

export function sanitizePermissoesDb(
  permissoesDb: Record<string, unknown> | null | undefined,
  contexto: {
    idSalao?: string | null;
    idUsuario?: string | null;
    origem?: string;
  } = {}
): Permissoes {
  if (!permissoesDb) return {};

  const ignora = new Set([
    "id",
    "id_usuario",
    "id_salao",
    "created_at",
    "updated_at",
  ]);
  const permissoesValidas = new Set(Object.keys(PERMISSIONS));
  const resultado: Permissoes = {};

  Object.entries(permissoesDb).forEach(([key, value]) => {
    if (ignora.has(key)) return;

    if (permissoesValidas.has(key)) {
      resultado[key] = Boolean(value);
      return;
    }

    if (LEGACY_PERMISSION_ALIASES[key]) {
      return;
    }

    if (!permissoesValidas.has(key)) {
      console.warn(`Permissao ignorada por chave desconhecida: ${key}`);
      void Promise.resolve({
        gravidade: "warning",
        modulo: "permissoes",
        idSalao: contexto.idSalao || null,
        idUsuario: contexto.idUsuario || null,
        mensagem: "Permissão desconhecida encontrada na configuração do usuário.",
        detalhes: {
          chave: key,
          origem: contexto.origem || "sanitizePermissoesDb",
        },
      });
      return;
    }
  });

  Object.entries(permissoesDb).forEach(([key, value]) => {
    const aliases = LEGACY_PERMISSION_ALIASES[key];
    if (!aliases) return;

    aliases.forEach((permission) => {
      if (resultado[permission] === undefined) {
        resultado[permission] = Boolean(value);
      }
    });
  });

  return resultado;
}
