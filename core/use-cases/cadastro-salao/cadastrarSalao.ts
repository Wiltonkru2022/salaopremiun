import { z } from "zod";
import {
  CadastroSalaoServiceError,
  type CadastroSalaoBody,
  type CadastroSalaoService,
} from "@/services/cadastroSalaoService";

const cadastroSalaoSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido."),
  senha: z
    .string()
    .trim()
    .min(1, "Informe a senha.")
    .min(6, "A senha deve ter pelo menos 6 caracteres."),
  nomeSalao: z.string().trim().min(1, "Informe o nome do salao."),
  responsavel: z.string().trim().min(1, "Informe o responsavel."),
  whatsapp: z.string().trim().optional(),
  cpfCnpj: z.string().trim().min(1, "Informe CPF/CNPJ."),
  cep: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  estado: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  plano: z.string().trim().optional(),
  origem: z.string().trim().optional(),
});

export class CadastroSalaoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CadastroSalaoUseCaseError";
  }
}

export async function cadastrarSalaoUseCase(params: {
  body: unknown;
  service: CadastroSalaoService;
}) {
  let authUserId: string | null = null;

  try {
    const input = cadastroSalaoSchema.parse(params.body) as CadastroSalaoBody;
    const payload = params.service.normalizePayload(input);

    const user = await params.service.criarUsuarioAuth({
      email: payload.emailNormalizado,
      senha: input.senha,
      nome: payload.responsavelNormalizado,
    });

    authUserId = user.id;

    const idSalao = await params.service.cadastrarSalaoTransacional({
      authUserId: user.id,
      payload,
    });

    await params.service.registrarCadastro({
      idSalao,
      origem: payload.origemNormalizada,
      plano: payload.planoNormalizado,
      email: payload.emailNormalizado,
    });

    return {
      status: 200,
      body: {
        ok: true,
        id_salao: idSalao,
      },
    };
  } catch (error) {
    if (authUserId) {
      await params.service.excluirUsuarioAuth(authUserId).catch(() => undefined);
    }

    if (error instanceof CadastroSalaoUseCaseError) {
      throw error;
    }

    if (error instanceof CadastroSalaoServiceError) {
      throw new CadastroSalaoUseCaseError(error.message, error.status);
    }

    if (error instanceof z.ZodError) {
      throw new CadastroSalaoUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw new CadastroSalaoUseCaseError(
      error instanceof Error ? error.message : "Erro interno no cadastro.",
      500
    );
  }
}
