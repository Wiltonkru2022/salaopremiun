import { addDays, format } from "date-fns";
import { z } from "zod";
import {
  AssinaturaServiceError,
  type AssinaturaService,
} from "@/services/assinaturaService";

const toggleRenovacaoSchema = z.object({
  idSalao: z.string().trim().min(1, "idSalao e obrigatorio."),
  renovacaoAutomatica: z
    .boolean()
    .or(z.literal(true))
    .or(z.literal(false)),
});

const iniciarTrialSchema = z.object({
  idSalao: z.string().trim().min(1, "idSalao e obrigatorio."),
});

const historicoSchema = z.object({
  idSalao: z.string().trim().min(1, "idSalao e obrigatorio."),
});

export class AssinaturaUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AssinaturaUseCaseError";
  }
}

function mapAssinaturaError(error: unknown, fallback: string): never {
  if (error instanceof AssinaturaUseCaseError) {
    throw error;
  }

  if (error instanceof AssinaturaServiceError) {
    throw new AssinaturaUseCaseError(error.message, error.status);
  }

  if (error instanceof z.ZodError) {
    throw new AssinaturaUseCaseError(
      error.issues[0]?.message || "Payload invalido.",
      400
    );
  }

  throw new AssinaturaUseCaseError(
    error instanceof Error ? error.message : fallback,
    500
  );
}

export async function toggleRenovacaoAssinaturaUseCase(params: {
  body: unknown;
  service: AssinaturaService;
}) {
  try {
    const input = toggleRenovacaoSchema.parse(params.body);

    await params.service.validarSalaoAdmin(
      input.idSalao,
      "Somente administrador pode alterar a renovacao automatica."
    );

    const assinatura = await params.service.buscarAssinaturaSalao(input.idSalao);

    if (!assinatura?.id) {
      throw new AssinaturaUseCaseError("Assinatura nao encontrada.", 404);
    }

    const renovacaoInfo = params.service.getRenovacaoInfo({
      assinaturaExiste: Boolean(assinatura.id),
      asaasCustomerId: assinatura.asaas_customer_id,
      formaPagamentoAtual: assinatura.forma_pagamento_atual,
      renovacaoAutomatica: input.renovacaoAutomatica,
      asaasCreditCardToken: assinatura.asaas_credit_card_token,
      asaasSubscriptionId: assinatura.asaas_subscription_id,
    });

    if (input.renovacaoAutomatica && renovacaoInfo.erroAtivacao) {
      throw new AssinaturaUseCaseError(renovacaoInfo.erroAtivacao, 400);
    }

    const formaPagamentoAtual = String(
      assinatura.forma_pagamento_atual || ""
    ).toUpperCase();
    const asaasSubscriptionId =
      String(assinatura.asaas_subscription_id || "").trim() || null;

    if (input.renovacaoAutomatica && formaPagamentoAtual === "CREDIT_CARD") {
      if (!asaasSubscriptionId) {
        const assinaturaValor = Number(assinatura.valor || 0);

        if (assinaturaValor <= 0) {
          throw new AssinaturaUseCaseError(
            "Nao foi possivel identificar o valor da assinatura para provisionar a recorrencia no cartao.",
            400
          );
        }

        await params.service.provisionarRecorrenciaCartao({
          assinaturaId: assinatura.id,
          idSalao: input.idSalao,
          customerId: String(assinatura.asaas_customer_id || "").trim(),
          creditCardToken: String(assinatura.asaas_credit_card_token || "").trim(),
          valor: assinaturaValor,
          plano: String(assinatura.plano || "salaopremium"),
          vencimentoEm: assinatura.vencimento_em,
        });
      }
    }

    if (!input.renovacaoAutomatica && asaasSubscriptionId) {
      await params.service.limparRecorrenciaCartao({
        assinaturaId: assinatura.id,
        idSalao: input.idSalao,
        asaasSubscriptionId,
      });
    }

    await params.service.atualizarRenovacaoAssinatura({
      assinaturaId: assinatura.id,
      idSalao: input.idSalao,
      renovacaoAutomatica: input.renovacaoAutomatica,
    });

    return {
      status: 200,
      body: {
        ok: true,
        renovacao_automatica: input.renovacaoAutomatica,
      },
    };
  } catch (error) {
    mapAssinaturaError(error, "Erro ao alterar renovacao automatica.");
  }
}

export async function iniciarTrialAssinaturaUseCase(params: {
  body: unknown;
  service: AssinaturaService;
}) {
  try {
    const input = iniciarTrialSchema.parse(params.body);

    await params.service.validarSalaoAdmin(
      input.idSalao,
      "Somente administrador pode iniciar o trial."
    );

    const salao = await params.service.buscarSalaoBasico(input.idSalao);

    if (!salao?.id) {
      throw new AssinaturaUseCaseError("Salao nao encontrado.", 404);
    }

    const assinaturaExistente = await params.service.buscarAssinaturaSalao(
      input.idSalao
    );

    if (assinaturaExistente?.id) {
      const statusAtual = String(assinaturaExistente.status || "").toLowerCase();

      if (
        ["teste_gratis", "trial", "ativo", "ativa", "pago"].includes(statusAtual)
      ) {
        return {
          status: 200,
          body: {
            ok: true,
            alreadyExists: true,
            status: assinaturaExistente.status,
            vencimento_em: assinaturaExistente.vencimento_em,
            trial_fim_em: assinaturaExistente.trial_fim_em,
          },
        };
      }
    }

    const planoTeste = await params.service.buscarPlanoTeste();
    const agora = new Date();
    const trialFim = addDays(agora, 7);
    const agoraIso = agora.toISOString();
    const trialFimIso = trialFim.toISOString();
    const vencimentoEm = format(trialFim, "yyyy-MM-dd");

    const resultado = await params.service.salvarTrial({
      idSalao: input.idSalao,
      planoTeste,
      assinaturaExistente,
      agoraIso,
      trialFimIso,
      vencimentoEm,
    });

    return {
      status: 200,
      body: {
        ok: true,
        ...resultado,
      },
    };
  } catch (error) {
    mapAssinaturaError(error, "Erro interno ao iniciar trial.");
  }
}

export async function historicoAssinaturaUseCase(params: {
  body: unknown;
  service: AssinaturaService;
}) {
  try {
    const input = historicoSchema.parse(params.body);

    await params.service.validarSalaoAdmin(
      input.idSalao,
      "Somente administrador pode consultar o historico."
    );

    const historico = await params.service.listarHistorico(input.idSalao);

    return {
      status: 200,
      body: {
        ok: true,
        historico,
      },
    };
  } catch (error) {
    mapAssinaturaError(error, "Erro interno ao carregar historico.");
  }
}
