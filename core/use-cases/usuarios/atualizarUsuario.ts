import type {
  UsuarioNivel,
  UsuarioService,
  UsuarioStatus,
} from "@/services/usuarioService";
import { buildSalonPasswordReuseHash } from "@/lib/auth/password-reuse";
import {
  atualizarUsuarioSchema,
  normalizeEmail,
  UsuarioUseCaseError,
} from "@/core/use-cases/usuarios/shared";

export type AtualizarUsuarioInput = {
  idUsuario: string;
  idSalao: string;
  nome: string;
  email: string;
  nivel: UsuarioNivel;
  status: UsuarioStatus;
  senha?: string;
};

export type AtualizarUsuarioResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseAtualizarUsuarioInput(body: unknown): AtualizarUsuarioInput {
  const parsed = atualizarUsuarioSchema.parse(body);
  return {
    idUsuario: parsed.idUsuario.trim(),
    idSalao: parsed.idSalao.trim(),
    nome: parsed.nome.trim(),
    email: normalizeEmail(parsed.email),
    nivel: parsed.nivel,
    status: parsed.status,
    senha: parsed.senha?.trim() || undefined,
  };
}

export async function atualizarUsuarioUseCase(params: {
  input: AtualizarUsuarioInput;
  service: UsuarioService;
}): Promise<AtualizarUsuarioResult> {
  const { input, service } = params;

  try {
    const usuarioAtual = await service.buscarUsuario({
      idUsuario: input.idUsuario,
      idSalao: input.idSalao,
    });

    if (!usuarioAtual?.id) {
      throw new UsuarioUseCaseError("Usuario nao encontrado.", 404);
    }

    const emailDuplicado = await service.buscarPorEmailExceto({
      idSalao: input.idSalao,
      email: input.email,
      idUsuario: input.idUsuario,
    });

    if (emailDuplicado?.id) {
      throw new UsuarioUseCaseError(
        "Ja existe outro usuario com esse e-mail neste salao.",
        409
      );
    }

    if (input.senha) {
      if (input.senha.length < 6) {
        throw new UsuarioUseCaseError(
          "A nova senha deve ter pelo menos 6 caracteres.",
          400
        );
      }

      const senhaHashReuso = buildSalonPasswordReuseHash({
        idSalao: input.idSalao,
        password: input.senha,
      });

      const reusedPassword = await service.buscarSenhaReuso({
        idSalao: input.idSalao,
        senhaHashReuso,
        idUsuarioExcluido: input.idUsuario,
      });

      if (reusedPassword?.id) {
        throw new UsuarioUseCaseError(
          "Esta senha ja esta sendo usada por outro usuario deste salao. Escolha uma senha diferente.",
          409
        );
      }

      if (usuarioAtual.auth_user_id) {
        await service.atualizarAuthUser({
          authUserId: usuarioAtual.auth_user_id,
          email: input.email,
          nome: input.nome,
          idSalao: input.idSalao,
          nivel: input.nivel,
          status: input.status,
          senha: input.senha,
        });
      }

      await service.registrarSenhaReuso({
        idSalao: input.idSalao,
        idUsuario: input.idUsuario,
        authUserId: usuarioAtual.auth_user_id || undefined,
        email: input.email,
        senhaHashReuso,
      });
    } else if (usuarioAtual.auth_user_id) {
      await service.atualizarAuthUser({
        authUserId: usuarioAtual.auth_user_id,
        email: input.email,
        nome: input.nome,
        idSalao: input.idSalao,
        nivel: input.nivel,
        status: input.status,
      });
    }

    await service.atualizarUsuario({
      idUsuario: input.idUsuario,
      idSalao: input.idSalao,
      nome: input.nome,
      email: input.email,
      nivel: input.nivel,
      status: input.status,
    });

    return {
      status: 200,
      body: {
        ok: true,
      },
    };
  } catch (error) {
    if (error instanceof UsuarioUseCaseError) {
      throw error;
    }

    throw new UsuarioUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao atualizar usuario.",
      500
    );
  }
}
