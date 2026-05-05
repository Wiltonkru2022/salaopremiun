import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { registrarLogSistema } from "@/lib/system-logs";

type RequireSalaoMembershipOptions = {
  allowedNiveis?: string[];
};

export class AuthzError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 403, code = "authz_denied") {
    super(message);
    this.name = "AuthzError";
    this.status = status;
    this.code = code;
  }
}

async function registrarTenantGuardLog(params: {
  idSalaoAtual?: string | null;
  idSalaoSolicitado?: string | null;
  idUsuario?: string | null;
  motivo: string;
  detalhes?: Record<string, unknown>;
}) {
  await registrarLogSistema({
    gravidade: "warning",
    modulo: "tenant_guard",
    idSalao: params.idSalaoAtual || null,
    idUsuario: params.idUsuario || null,
    mensagem: params.motivo,
    detalhes: {
      id_salao_solicitado: params.idSalaoSolicitado || null,
      id_salao_usuario: params.idSalaoAtual || null,
      ...params.detalhes,
    },
  });
}

export async function requireSalaoMembership(
  idSalao: string,
  options: RequireSalaoMembershipOptions = {}
) {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    throw new AuthzError("Usuario nao autenticado.", 401);
  }

  if (!usuario?.id_salao || usuario.id_salao !== idSalao) {
    await registrarTenantGuardLog({
      idSalaoAtual: usuario?.id_salao || null,
      idSalaoSolicitado: idSalao,
      idUsuario: usuario?.id || null,
      motivo: "Tentativa de acesso negada por isolamento multi-tenant.",
      detalhes: {
        auth_user_id: user.id,
        usuario_tem_salao: Boolean(usuario?.id_salao),
      },
    });

    throw new AuthzError("Acesso negado para este salao.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    await registrarTenantGuardLog({
      idSalaoAtual: usuario.id_salao,
      idSalaoSolicitado: idSalao,
      idUsuario: usuario.id,
      motivo: "Usuario inativo tentou acessar area protegida do salao.",
      detalhes: {
        status_usuario: usuario.status || null,
      },
    });

    throw new AuthzError("Usuario inativo.", 403);
  }

  if (options.allowedNiveis?.length) {
    const nivelNormalizado = String(usuario.nivel || "").toLowerCase();
    const niveisPermitidos = options.allowedNiveis.map((item) =>
      item.toLowerCase()
    );

    if (!niveisPermitidos.includes(nivelNormalizado)) {
      await registrarTenantGuardLog({
        idSalaoAtual: usuario.id_salao,
        idSalaoSolicitado: idSalao,
        idUsuario: usuario.id,
        motivo: "Usuario tentou executar acao sem nivel permitido.",
        detalhes: {
          nivel_usuario: nivelNormalizado,
          niveis_permitidos: niveisPermitidos,
        },
      });

      throw new AuthzError("Usuario sem nivel permitido para esta acao.", 403);
    }
  }

  return { user, usuario };
}
