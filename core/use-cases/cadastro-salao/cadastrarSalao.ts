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
    .min(8, "A senha deve ter pelo menos 8 caracteres."),
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

function allDigitsEqual(value: string) {
  return /^([0-9])\1+$/.test(value);
}

function validarCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || allDigitsEqual(cpf)) return false;
  const calc = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) total += Number(digit) * factor--;
    const resto = (total * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  if (d1 !== Number(cpf[9])) return false;
  const d2 = calc(cpf.slice(0, 10), 11);
  return d2 === Number(cpf[10]);
}

function validarCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || allDigitsEqual(cnpj)) return false;
  const calcular = (base: string, pesos: number[]) => {
    const total = base
      .split("")
      .reduce((acc, digit, index) => acc + Number(digit) * pesos[index], 0);
    const resto = total % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const base = cnpj.slice(0, 12);
  const d1 = calcular(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(cnpj[12])) return false;
  const d2 = calcular(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(cnpj[13]);
}

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

    const documentoValido =
      payload.cpfCnpjLimpo.length === 11
        ? validarCpf(payload.cpfCnpjLimpo)
        : payload.cpfCnpjLimpo.length === 14
          ? validarCnpj(payload.cpfCnpjLimpo)
          : false;

    if (!documentoValido) {
      throw new CadastroSalaoUseCaseError("Informe um CPF ou CNPJ válido.", 400);
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
        onboarding_pendente: true,
        assinatura: null,
      },
    };
  } catch (error) {
    if (authUserId) {
      await params.service.excluirUsuarioAuth(authUserId).catch(() => undefined);
    }

    if (error instanceof CadastroSalaoUseCaseError) throw error;

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
