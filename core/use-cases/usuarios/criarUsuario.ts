import {
  assertCanCreateWithinLimit,
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { buildSalonPasswordReuseHash } from "@/lib/auth/password-reuse";
import type {
  UsuarioNivel,
  UsuarioService,
  UsuarioStatus,
} from "@/services/usuarioService";
import {
  criarUsuarioSchema,
  normalizeEmail,
  UsuarioUseCaseError,
} from "@/core/use-cases/usuarios/shared";

export type CriarUsuarioInput = {
  idSalao: string;
  nome: string;
  email: string;
  senha: string;
  nivel: UsuarioNivel;
  status: UsuarioStatus;
};

export type CriarUsuarioResult = {
  body: Record<string, unknown>;
  status: number;
};

export function parseCriarUsuarioInput(body: unknown): CriarUsuarioInput {
  const parsed = criarUsuarioSchema.parse(body);
  return {
    idSalao: parsed.idSalao.trim(),
    nome: parsed.nome.trim(),
    email: normalizeEmail(parsed.email),
    senha: parsed.senha,
    nivel: parsed.nivel,
    status: parsed.status,
  };
}

export async function criarUsuarioUseCase(params: {
  input: CriarUsuarioInput;
  service: UsuarioService;
}): Promise<CriarUsuarioResult> {
  const { input, service } = params;
  let authUserId: string | null = null;

  try {
    await assertCanMutatePlanFeature(input.idSalao, "usuarios");

    if (input.status === "ativo") {
      await assertCanCreateWithinLimit(input.idSalao, "usuarios");
    }

    const senhaHashReuso = buildSalonPasswordReuseHash({
      idSalao: input.idSalao,
      password: input.senha,
    });

    const reusedPassword = await service.buscarSenhaReuso({
      idSalao: input.idSalao,
      senhaHashReuso,
    });

    if (reusedPassword?.id) {
      throw new UsuarioUseCaseError(
        "Esta senha ja esta sendo usada por outro usuario deste salao. Escolha uma senha diferente.",
        409
      );
    }

    const existingUser = await service.buscarPorEmail({
      idSalao: input.idSalao,
      email: input.email,
    });

    if (existingUser?.id) {
      throw new UsuarioUseCaseError(
        "Ja existe um usuario com esse e-mail neste salao.",
        409
      );
    }

    const authCreated = await service.criarAuthUser({
      email: input.email,
      senha: input.senha,
      nome: input.nome,
      idSalao: input.idSalao,
      nivel: input.nivel,
    });

    authUserId = authCreated.authUserId;

    const usuarioInserido = await service.inserirUsuario({
      idSalao: input.idSalao,
      nome: input.nome,
      email: input.email,
      nivel: input.nivel,
      status: input.status,
      authUserId,
    });

    try {
      await service.registrarSenhaReuso({
        idSalao: input.idSalao,
        idUsuario: String(usuarioInserido.id),
        authUserId,
        email: input.email,
        senhaHashReuso,
      });
    } catch (error) {
      await service.excluirUsuario({
        idUsuario: String(usuarioInserido.id),
        idSalao: input.idSalao,
      });
      if (authUserId) {
        await service.deleteAuthUser(authUserId);
      }
      throw error;
    }

    return {
      status: 200,
      body: {
        ok: true,
        usuario: usuarioInserido,
      },
    };
  } catch (error) {
    if (authUserId) {
      try {
        await service.deleteAuthUser(authUserId);
      } catch {}
    }

    if (error instanceof UsuarioUseCaseError || error instanceof PlanAccessError) {
      throw error;
    }

    throw new UsuarioUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao criar usuario.",
      500
    );
  }
}
