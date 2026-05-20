import { z } from "zod";
import {
  CadastroSalaoServiceError,
  type CadastroSalaoBody,
  type CadastroSalaoService,
} from "@/services/cadastroSalaoService";

const optionalString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value.trim() : undefined));

const cadastroSalaoSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z
    .string()
    .trim()
    .min(1, "Informe a senha.")
    .min(6, "A senha deve ter pelo menos 6 caracteres."),
  nomeSalao: z.string().trim().min(1, "Informe o nome do salão."),
  responsavel: z.string().trim().min(1, "Informe o responsável."),
  whatsapp: optionalString,
  cpfCnpj: optionalString,
  cep: optionalString,
  endereco: optionalString,
  bairro: optionalString,
  cidade: optionalString,
  estado: optionalString,
  numero: optionalString,
  complemento: optionalString,
  plano: optionalString,
  origem: optionalString,
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

    if (!payload.cpfCnpjLimpo) {
      throw new CadastroSalaoUseCaseError("Informe o CPF ou CNPJ.", 400);
    }

    if (payload.cpfCnpjLimpo.length !== 11 && payload.cpfCnpjLimpo.length !== 14) {
      throw new CadastroSalaoUseCaseError(
        "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.",
        400
      );
    }

    const duplicidade = await params.service.verificarDuplicidade(payload);

    if (duplicidade.email) {
      throw new CadastroSalaoUseCaseError(
        "Esse e-mail já está cadastrado. Use outro e-mail ou entre no login.",
        409
      );
    }

    if (duplicidade.nomeSalao) {
      throw new CadastroSalaoUseCaseError(
        "Já existe um salão com esse nome. Ajuste o nome para continuar.",
        409
      );
    }

    if (duplicidade.whatsapp) {
      throw new CadastroSalaoUseCaseError(
        "Esse WhatsApp já aparece em outro cadastro de salão.",
        409
      );
    }

    if (duplicidade.cpfCnpj) {
      throw new CadastroSalaoUseCaseError(
        "Esse CPF/CNPJ já aparece em outro cadastro de salão.",
        409
      );
    }

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
    const trial = await params.service.ativarTrialInicial(idSalao);

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
        assinatura: trial,
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
        error.issues[0]?.message || "Dados inválidos para cadastro.",
        400
      );
    }

    throw new CadastroSalaoUseCaseError(
      error instanceof Error ? error.message : "Erro interno no cadastro.",
      500
    );
  }
}
