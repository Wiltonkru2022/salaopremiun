export type RenovacaoAutomaticaTone = "green" | "amber" | "red" | "zinc";

export type RenovacaoAutomaticaCode =
  | "subscription_missing"
  | "missing_customer"
  | "missing_payment_method"
  | "credit_card_requires_tokenization"
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
};

const PAYMENT_METHODS_COMPATIVEIS = new Set(["PIX", "BOLETO"]);

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
    prontaParaCobranca: boolean;
  }
): RenovacaoAutomaticaInfo {
  const { assinaturaExiste, renovacaoAutomatica, prontaParaCobranca } = options;

  return {
    ...base,
    podeAtivar: assinaturaExiste && prontaParaCobranca,
    podeAlternar:
      assinaturaExiste && (prontaParaCobranca || renovacaoAutomatica),
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
  const prontaParaCobranca =
    possuiCustomerAsaas &&
    PAYMENT_METHODS_COMPATIVEIS.has(formaPagamentoNormalizada);

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
        prontaParaCobranca: false,
      }
    );
  }

  if (formaPagamentoNormalizada === "CREDIT_CARD") {
    return buildInfo(
      {
        code: "credit_card_requires_tokenization",
        titulo: renovacaoAutomatica
          ? "Ativada com ajuste pendente"
          : "Cartao ainda nao esta apto",
        descricao:
          "Hoje a renovacao automatica so gera a proxima cobranca com PIX ou boleto. Cartao automatico exige tokenizacao segura antes de ligar.",
        observacao: renovacaoAutomatica
          ? "Desative ate a tokenizacao do cartao ficar pronta ou use PIX/boleto como forma atual."
          : "Use PIX ou boleto na proxima cobranca para ativar agora, ou aguarde a tokenizacao do cartao.",
        tone: "amber",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Renovacao automatica por cartao exige tokenizacao antes de ser ativada.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
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
          "Gere uma cobranca PIX ou boleto uma vez para vincular o salao ao Asaas e depois ligue a renovacao automatica.",
        tone: "red",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Ative uma cobranca PIX ou boleto primeiro para vincular o salao ao Asaas antes de ligar a renovacao automatica.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
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
          "Defina PIX ou boleto como forma da assinatura para deixar a recorrencia pronta.",
        tone: "amber",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "Defina uma forma de pagamento antes de ativar a renovacao automatica.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
        prontaParaCobranca: false,
      }
    );
  }

  if (!PAYMENT_METHODS_COMPATIVEIS.has(formaPagamentoNormalizada)) {
    return buildInfo(
      {
        code: "unsupported_payment_method",
        titulo: renovacaoAutomatica
          ? "Ativada com forma invalida"
          : "Escolha PIX ou boleto",
        descricao:
          "A renovacao automatica precisa de uma forma atual compativel para gerar a proxima cobranca antes do vencimento.",
        observacao:
          "Defina PIX ou boleto como forma da assinatura para deixar a recorrencia pronta.",
        tone: "amber",
        formaPagamentoNormalizada,
        possuiCustomerAsaas,
        erroAtivacao:
          "A renovacao automatica hoje funciona com PIX ou boleto. Gere a cobranca com uma dessas formas primeiro.",
      },
      {
        assinaturaExiste,
        renovacaoAutomatica,
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
      prontaParaCobranca: true,
    }
  );
}
