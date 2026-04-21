import { z } from "zod";
import type {
  AssinaturaCheckoutService,
  BodyInput,
} from "@/services/assinaturaCheckoutService";

const creditCardSchema = z.object({
  holderName: z.string().trim().min(1, "Nome impresso no cartao e obrigatorio."),
  number: z.string().trim().min(1, "Numero do cartao e obrigatorio."),
  expiryMonth: z.string().trim().min(1, "Mes de expiracao e obrigatorio."),
  expiryYear: z.string().trim().min(1, "Ano de expiracao e obrigatorio."),
  ccv: z.string().trim().min(1, "Codigo de seguranca e obrigatorio."),
});

const criarCobrancaSchema = z
  .object({
    idSalao: z.string().trim().min(1, "idSalao e obrigatorio."),
    nomeSalao: z.string().trim().optional(),
    responsavelNome: z.string().trim().min(1, "Nome do responsavel e obrigatorio."),
    responsavelEmail: z
      .string()
      .trim()
      .email("E-mail do responsavel invalido."),
    responsavelCpfCnpj: z.string().trim().optional(),
    responsavelTelefone: z.string().trim().optional(),
    cep: z.string().trim().optional(),
    numero: z.string().trim().optional(),
    complemento: z.string().trim().optional(),
    plano: z.enum(["basico", "pro", "premium"]),
    billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]),
    creditCard: creditCardSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.billingType !== "CREDIT_CARD") {
      return;
    }

    if (!input.creditCard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preencha todos os dados do cartao.",
        path: ["creditCard"],
      });
    }
  });

export class AssinaturaCheckoutUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AssinaturaCheckoutUseCaseError";
  }
}

export async function criarCobrancaAssinaturaUseCase(params: {
  body: unknown;
  idempotencyKey: string;
  service: AssinaturaCheckoutService;
}) {
  try {
    const input = criarCobrancaSchema.parse(params.body) as BodyInput;

    return await params.service.criarCobranca({
      body: input,
      idempotencyKey: params.idempotencyKey,
    });
  } catch (error) {
    if (error instanceof AssinaturaCheckoutUseCaseError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new AssinaturaCheckoutUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw new AssinaturaCheckoutUseCaseError(
      error instanceof Error ? error.message : "Erro interno ao criar cobranca.",
      500
    );
  }
}
