import type { UsuarioService } from "@/services/usuarioService";
import {
  excluirUsuarioSchema,
  UsuarioUseCaseError,
} from "@/core/use-cases/usuarios/shared";

export type ExcluirUsuarioInput = {
  idUsuario: string;
  idSalao: string;
};

export type ExcluirUsuarioResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseExcluirUsuarioInput(body: unknown): ExcluirUsuarioInput {
  const parsed = excluirUsuarioSchema.parse(body);
  return {
    idUsuario: parsed.idUsuario.trim(),
    idSalao: parsed.idSalao.trim(),
  };
}

export async function excluirUsuarioUseCase(params: {
  input: ExcluirUsuarioInput;
  service: UsuarioService;
}): Promise<ExcluirUsuarioResult> {
  const { input, service } = params;

  try {
    const usuario = await service.buscarUsuario({
      idUsuario: input.idUsuario,
      idSalao: input.idSalao,
    });

    if (!usuario?.id) {
      throw new UsuarioUseCaseError("Usuario nao encontrado.", 404);
    }

    const nivelUsuario = String(usuario.nivel || "").toLowerCase();
    if (nivelUsuario === "admin") {
      const adminsCount = await service.contarAdminsAtivos(input.idSalao);
      if (adminsCount <= 1) {
        throw new UsuarioUseCaseError(
          "Nao e permitido excluir o ultimo admin ativo do salao.",
          409
        );
      }
    }

    await service.excluirPermissoes({
      idUsuario: input.idUsuario,
      idSalao: input.idSalao,
    });

    await service.excluirUsuario({
      idUsuario: input.idUsuario,
      idSalao: input.idSalao,
    });

    let authRemovido = false;
    let authAviso: string | null = null;

    if (usuario.auth_user_id) {
      const { error: authDeleteError } = await service.deleteAuthUser(
        usuario.auth_user_id
      );

      if (authDeleteError) {
        authAviso =
          "Usuario removido das tabelas, mas nao foi possivel excluir do Supabase Auth.";
      } else {
        authRemovido = true;
      }
    } else {
      authAviso =
        "Usuario removido das tabelas. Nao havia auth_user_id para excluir no Supabase Auth.";
    }

    return {
      status: 200,
      body: {
        ok: true,
        message: "Usuario excluido com sucesso.",
        auth_removido: authRemovido,
        auth_aviso: authAviso,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        },
      },
    };
  } catch (error) {
    if (error instanceof UsuarioUseCaseError) {
      throw error;
    }

    throw new UsuarioUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao excluir usuario.",
      500
    );
  }
}
