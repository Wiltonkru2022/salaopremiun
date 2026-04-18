export type RenovacaoAutomaticaTone = "green" | "amber" | "red" | "zinc";

export type RenovacaoAutomaticaCode =
  | "subscription_missing"
  | "missing_customer"
  | "missing_payment_method"
  | "credit_card_requires_tokenization"
  | "credit_card_subscription_missing"
  | "unsupported_payment_method"
  | "ready_disabled"
  | "ready_enabled";

export type RenovacaoAutomaticaInfo = {
  code: RenovacaoAutomaticaCode;
  podeAtivar: boolean;
  podeAlternar: boolean;
  estaProntaParaCobranca: boolean;
  titulo: string;
  descricao: string;
  observacao: string;
  tone: RenovacaoAutomaticaTone;
  formaPagamentoNormalizada: string;
  possuiCustomerAsaas: boolean;
  erroAtivacao: string | null;
};

type GetRenovacaoAutomaticaInfoParams = {
  assinaturaExiste?: boolean;
  asaasCustomerId?: string | null;
  formaPagamentoAtual?: string | null;
  renovacaoAutomatica?: boolean | null;
  asaasCreditCardToken?: string | null;
  asaasSubscriptionId?: string | null;
};

const NON_CARD_PAYMENT_METHODS = new Set(["PIX", "BOLETO"]);

export function normalizePaymentMethod(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeChargeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function isPendingChargeStatus(value: unknown) {
  return ["pending", "pendente", "aguardando_pagamento"].includes(
    normalizeChargeStatus(value)
  );
}

export function isPaidChargeStatus(value: unknown) {
  return ["received", "confirmed", "pago", "paid"].includes(
    normalizeChargeStatus(value)
  );
}

function buildInfo(
  base: Omit<
    RenovacaoAutomaticaInfo,
    "podeAtivar" | "podeAlternar" | "estaProntaParaCobranca"
  >,
  options: {
    assinaturaExiste: boolean;
    renovacaoAutomatica: boolean;
    prontaParaAtivar: boolean;
    prontaParaCobranca: boolean;
  }
): RenovacaoAutomaticaInfo {
  const {
    assinaturaExiste,
    renovacaoAutomatica,
    prontaParaAtivar,
    prontaParaCobranca,
  } = options;

  return {
    ...base,
    podeAtivar: assinaturaExiste && prontaParaAtivar,
    podeAlternar:
      assinaturaExiste &&
      (prontaParaAtivar || prontaParaCobranca || renovacaoAutomatica),
    estaProntaParaCobranca: assinaturaExiste && prontaParaCobranca,
  };
}

export function getRenovacaoAutomaticaInfo(
  params: GetRenovacaoAutomaticaInfoParams
): RenovacaoAutomaticaInfo {
  const assinaturaExiste = Boolean(params.assinaturaExiste);
  const renovacaoAutomatica = Boolean(params.renovacaoAutomatica);
  const formaPagamentoNormalizada = normalizePaymentMethod(
    params.formaPagamentoAtual
  );
  const possuiCustomerAsaas = Boolean(
    String(params.asaasCustomerId || "").trim()
  );
  const possuiCartaoTokenizado = Boolean(
    String(params.asaasCreditCardToken || "").trim()
  );
  const possuiAssinaturaRecorrenteCartao = Boolean(
    String(params.asaasSubscriptionId || "").trim()
  );

  if (!assinaturaExiste) {
    return buildInfo(
      {
        code: "subscription_missing",
        titulo: "Disponivel apos a assinatura",
        descricao:
          "Escolha um plano e gere a primeira cobranca para liberar a renovacao automatica.",
        observacao:
          "A configuracao aparece quando o salao ja tem uma assinatura vinculada.",
        tone: "zinc",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Escolha um plano e gere a primeira cobranca antes de ativar a renovacao automatica.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaAtivar: false,
        prontaParaCobranca: false,
      }
    );
  }

  if (!possuiCustomerAsaas) {
    return buildInfo(
      {
        code: "missing_customer",
        titulo: renovacaoAutomatica
          ? "Ativada com cadastro incompleto"
          : "Configure a primeira cobranca",
        descricao:
          "O salao ainda nao esta vinculado ao customer do Asaas. Sem isso, o cron nao consegue gerar a proxima cobranca automaticamente.",
        observacao:
          "Gere uma cobranca uma vez para vincular o salao ao Asaas antes de ligar a renovacao automatica.",
        tone: "red",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Ative uma cobranca primeiro para vincular o salao ao Asaas antes de ligar a renovacao automatica.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaAtivar: false,
        prontaParaCobranca: false,
      }
    );
  }

  if (!formaPagamentoNormalizada) {
    return buildInfo(
      {
        code: "missing_payment_method",
        titulo: renovacaoAutomatica
          ? "Ativada com forma indefinida"
          : "Defina a forma de pagamento",
        descricao:
          "A renovacao automatica precisa de uma forma atual compativel para gerar a proxima cobranca antes do vencimento.",
        observacao:
          "Defina PIX, boleto ou cartao como forma da assinatura para deixar a recorrencia pronta.",
        tone: "amber",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Defina uma forma de pagamento antes de ativar a renovacao automatica.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaAtivar: false,
        prontaParaCobranca: false,
      }
    );
  }

  if (formaPagamentoNormalizada === "CREDIT_CARD") {
    if (renovacaoAutomatica && possuiAssinaturaRecorrenteCartao) {
      return buildInfo(
        {
          code: "ready_enabled",
          titulo: "Ativada e pronta",
          descricao:
            "O Asaas esta provisionado para gerar as proximas cobrancas mensais no cartao automaticamente.",
          observacao:
            "Se precisar pausar, desligue a configuracao para remover a assinatura recorrente do Asaas.",
          tone: "green",
          formaPagamentoNormalizada,
          possuiCustomerAsaas,
          erroAtivacao: null,
        },
        {
          assinaturaExiste,
          renovacaoAutomatica,
          prontaParaAtivar: true,
          prontaParaCobranca: true,
        }
      );
    }

    if (renovacaoAutomatica && possuiCartaoTokenizado) {
      return buildInfo(
        {
          code: "credit_card_subscription_missing",
          titulo: "Ativada com provisionamento pendente",
          descricao:
            "O cartao esta tokenizado, mas a assinatura recorrente do Asaas ainda nao foi provisionada para as proximas mensalidades.",
          observacao:
            "Desative e ative novamente para tentar provisionar a recorrencia no Asaas com o cartao salvo.",
          tone: "red",
          formaPagamentoNormalizada,
          possuiCustomerAsaas,
          erroAtivacao:
            "Renovacao automatica no cartao ainda nao foi provisionada no Asaas.",
        },
        {
          assinaturaExiste,
          renovacaoAutomatica,
          prontaParaAtivar: true,
          prontaParaCobranca: false,
        }
      );
    }

    if (possuiCartaoTokenizado || possuiAssinaturaRecorrenteCartao) {
      return buildInfo(
        {
          code: "ready_disabled",
          titulo: possuiAssinaturaRecorrenteCartao
            ? "Cartao recorrente pronto"
            : "Cartao tokenizado e pronto",
          descricao:
            "O cartao ja pode ser usado para provisionar a recorrencia mensal no Asaas sem pedir os dados novamente.",
          observacao: possuiAssinaturaRecorrenteCartao
            ? "Ao ativar, o sistema volta a monitorar a assinatura recorrente que ja esta provisionada."
            : "Ao ativar, o sistema cria a assinatura recorrente mensal no Asaas usando o cartao salvo.",
          tone: "green",
          formaPagamentoNormalizada,
          possuiCustomerAsaas,
          erroAtivacao: null,
        },
        {
          assinaturaExiste,
          renovacaoAutomatica,
          prontaParaAtivar: true,
          prontaParaCobranca: possuiAssinaturaRecorrenteCartao,
        }
      );
    }

    return buildInfo(
      {
        code: "credit_card_requires_tokenization",
        titulo: renovacaoAutomatica
          ? "Ativada com ajuste pendente"
          : "Cartao ainda nao esta apto",
        descricao:
          "O cartao precisa passar pela primeira cobranca e tokenizacao segura antes de ser usado para recorrencia automatica.",
        observacao: renovacaoAutomatica
          ? "Desative ate a tokenizacao do cartao ficar pronta ou gere uma nova cobranca no cartao para refazer o provisionamento."
          : "Gere uma cobranca no cartao uma vez para salvar o token e liberar a recorrencia automatica.",
        tone: "amber",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Renovacao automatica por cartao exige tokenizacao antes de ser ativada.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaAtivar: false,
        prontaParaCobranca: false,
      }
    );
  }

  if (!NON_CARD_PAYMENT_METHODS.has(formaPagamentoNormalizada)) {
    return buildInfo(
      {
        code: "unsupported_payment_method",
        titulo: renovacaoAutomatica
          ? "Ativada com forma invalida"
          : "Escolha uma forma compativel",
        descricao:
          "A renovacao automatica precisa de uma forma atual compativel para gerar a proxima cobranca antes do vencimento.",
        observacao:
          "Defina PIX, boleto ou cartao tokenizado como forma da assinatura para deixar a recorrencia pronta.",
        tone: "amber",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "A forma de pagamento atual ainda nao esta apta para a renovacao automatica.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaAtivar: false,
        prontaParaCobranca: false,
      }
    );
  }

  if (renovacaoAutomatica) {
    return buildInfo(
      {
        code: "ready_enabled",
        titulo: "Ativada e pronta",
        descricao:
          "O sistema esta configurado para gerar a proxima cobranca automaticamente perto do vencimento usando a forma atual.",
        observacao:
          "Se precisar pausar, voce pode desligar a configuracao a qualquer momento.",
        tone: "green",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao: null,
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaAtivar: true,
        prontaParaCobranca: true,
      }
    );
  }

  return buildInfo(
    {
      code: "ready_disabled",
      titulo: "Pronta para ativar",
      descricao:
        "Seu salao ja tem customer no Asaas e forma compativel. Ao ativar, o sistema passa a gerar a proxima cobranca com antecedencia.",
      observacao:
        "Ative para reduzir risco de esquecimento e inadimplencia nas proximas renovacoes.",
      tone: "green",
      formaPagamentoNormalizada,
      possuiCustomerAsaas,
      erroAtivacao: null,
    },
    {
      assinaturaExiste,
      renovacaoAutomatica,
      prontaParaAtivar: true,
      prontaParaCobranca: true,
    }
  );
}
